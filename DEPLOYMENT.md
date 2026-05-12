# DEPLOYMENT — DigitalOcean + Cloudflare

> Prerequisite: complete Phase B of [SETUP.md](./SETUP.md). You need a droplet, a domain, Cloudflare in front of it, and a Supabase project.

---

## 1. Droplet first-time setup

SSH in as root, create a deploy user, install dependencies.

```bash
ssh root@<droplet-ip>

# Create deploy user
adduser deploy
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
exit

# Now reconnect as deploy
ssh deploy@<droplet-ip>

# Update + install
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx git build-essential ufw

# Node 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# pm2
sudo npm install -g pm2
pm2 startup systemd       # follow the printed instructions

# Firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### Cloudflare Origin Certificate (recommended — never expires)

1. Cloudflare → SSL/TLS → Origin Server → Create Certificate. Hostnames: `yourdomain.ge, *.yourdomain.ge`. Validity: 15 years.
2. Save cert + key on the droplet:
   ```bash
   sudo nano /etc/ssl/cloudflare-origin.pem    # paste cert
   sudo nano /etc/ssl/cloudflare-origin.key    # paste key
   sudo chmod 600 /etc/ssl/cloudflare-origin.key
   ```
3. Cloudflare → SSL/TLS → encryption mode: **Full (strict)**.

---

## 2. Deploy the code

```bash
sudo mkdir -p /var/www/bookbridge
sudo chown deploy:deploy /var/www/bookbridge
cd /var/www/bookbridge
git clone https://github.com/<your-org>/BookBridge.git .
```

### Configure `.env` files

Copy production env values into `server/.env`, `frontend/.env`, `admin/.env`.

For frontend/admin:
```
VITE_API_BASE=https://api.yourdomain.ge
```

For `server/.env`:
```
NODE_ENV=production
PORT=3001
PUBLIC_FRONTEND_ORIGIN=https://yourdomain.ge
PUBLIC_ADMIN_ORIGIN=https://admin.yourdomain.ge
```

### Install + build + run

```bash
cd /var/www/bookbridge
npm run install:all
npm run build

cd server
pm2 start index.js --name bookbridge-api
pm2 save

# Verify
curl http://127.0.0.1:3001/api/health    # {"status":"ok"}
```

---

## 3. nginx

Create `/etc/nginx/sites-available/bookbridge`:

```nginx
# HTTP → HTTPS redirect (Cloudflare also proxies, but defense in depth)
server {
  listen 80;
  server_name yourdomain.ge admin.yourdomain.ge api.yourdomain.ge;
  return 301 https://$host$request_uri;
}

# Public frontend
server {
  listen 443 ssl http2;
  server_name yourdomain.ge www.yourdomain.ge;

  ssl_certificate /etc/ssl/cloudflare-origin.pem;
  ssl_certificate_key /etc/ssl/cloudflare-origin.key;
  ssl_protocols TLSv1.2 TLSv1.3;

  root /var/www/bookbridge/frontend/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }
  location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}

# Admin SPA
server {
  listen 443 ssl http2;
  server_name admin.yourdomain.ge;

  ssl_certificate /etc/ssl/cloudflare-origin.pem;
  ssl_certificate_key /etc/ssl/cloudflare-origin.key;

  root /var/www/bookbridge/admin/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }
}

# API
server {
  listen 443 ssl http2;
  server_name api.yourdomain.ge;

  ssl_certificate /etc/ssl/cloudflare-origin.pem;
  ssl_certificate_key /etc/ssl/cloudflare-origin.key;

  client_max_body_size 10M;

  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Enable + reload:

```bash
sudo ln -s /etc/nginx/sites-available/bookbridge /etc/nginx/sites-enabled/bookbridge
sudo nginx -t
sudo systemctl reload nginx
```

---

## 4. Subsequent deploys

Manual:
```bash
ssh deploy@<droplet-ip>
cd /var/www/bookbridge
git pull
npm run install:all
npm run build
pm2 restart bookbridge-api
```

Optional GitHub Actions auto-deploy on push to `main` — see commented example at the bottom of `.github/workflows/deploy.yml` (not committed by default).

---

## 5. Smoke test after each deploy

```bash
curl https://api.yourdomain.ge/api/health      # {"status":"ok"}
curl -I https://yourdomain.ge/                 # 200
curl -I https://admin.yourdomain.ge/           # 200
```

Open all three in the browser. Check DevTools → Network for 500s / CORS errors.

---

## 6. Rollback

```bash
cd /var/www/bookbridge
git log --oneline -5
git reset --hard <last-good-commit>
npm run install:all && npm run build
pm2 restart bookbridge-api
```

---

## 7. Logs

```bash
pm2 logs bookbridge-api               # live API logs
pm2 logs bookbridge-api --lines 200   # last 200 lines
sudo tail -f /var/log/nginx/access.log
sudo journalctl -u nginx -f           # nginx errors
```
