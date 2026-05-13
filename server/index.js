import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import { csrfInit } from './middleware/csrf.js';
import { attachUser } from './middleware/auth.js';

import publicRoutes from './routes/public.js';
import authRoutes from './routes/auth.js';
import schoolsRoutes, { adminRouter as adminSchoolsRoutes } from './routes/schools.js';
import donationsRoutes, { adminRouter as adminDonationsRoutes } from './routes/donations.js';
import paymentsRoutes from './routes/payments.js';
import volunteerRoutes from './routes/volunteer.js';
import storageRoutes from './routes/storage.js';
import adminRoutes from './routes/admin.js';

const app = express();

// Behind nginx / Cloudflare: required for express-rate-limit and accurate req.ip.
app.set('trust proxy', 1);

const allowedOrigins = [
  process.env.PUBLIC_FRONTEND_ORIGIN || 'http://localhost:5173',
  process.env.PUBLIC_ADMIN_ORIGIN || 'http://localhost:5174',
];
app.use(cors({
  origin(origin, cb) {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS: origin not allowed: ' + origin));
  },
  credentials: true,
  exposedHeaders: ['x-csrf-token'],
}));

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'"],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
      'img-src': ["'self'", 'data:', 'https:'],
      'connect-src': ["'self'", 'https://*.supabase.co', 'https://api.mapbox.com'],
      'frame-src': ["'self'", 'https://pay.flitt.com', 'https://ecommerce.ufc.ge'],
      'child-src': ["'self'", 'https://pay.flitt.com', 'https://ecommerce.ufc.ge'],
      'form-action': ["'self'", 'https://pay.flitt.com', 'https://ecommerce.ufc.ge'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(express.json({
  limit: '1mb',
  // Capture rawBody for webhook HMAC verification (Flitt).
  verify: (req, _res, buf) => { req.rawBody = buf.toString('utf8'); },
}));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(csrfInit);

const limiter = rateLimit({
  windowMs: 60_000,
  limit: Number(process.env.RATE_LIMIT_PER_MIN) || 120,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== 'production',
});
app.use('/api/', (req, res, next) => {
  if (req.path.endsWith('/webhook')) return next();
  return limiter(req, res, next);
});

app.use(attachUser);

app.use('/api', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/schools', schoolsRoutes);
app.use('/api/donations', donationsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/volunteer', volunteerRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/schools', adminSchoolsRoutes);
app.use('/api/admin/donations', adminDonationsRoutes);

app.use('/api', (_req, res) => res.status(404).json({ error: 'not_found' }));

app.use((err, _req, res, _next) => {
  console.error('[server] error:', err);
  res.status(err.status || 500).json({ error: err.message || 'internal_error' });
});

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`BookBridge API listening on http://localhost:${PORT}`);
});
