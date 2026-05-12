import { useState } from 'react';
import { apiPost } from '../api.js';

export default function PhotoUpload({ bucket = 'school-photos', onUploaded, label = 'Upload photo', initialUrl }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [preview, setPreview] = useState(initialUrl || null);

  async function handle(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setErr('Max 5 MB'); return; }
    setBusy(true); setErr(null);
    try {
      const sig = await apiPost('/api/storage/sign-upload', { bucket, filename: file.name });
      const put = await fetch(sig.signed_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });
      if (!put.ok) throw new Error('upload failed: ' + put.status);
      setPreview(sig.public_url);
      onUploaded?.(sig.public_url);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      {preview && (
        <img src={preview} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 12, border: '2px solid var(--mist)' }} />
      )}
      <label className="btn-secondary" style={{ cursor: 'pointer' }}>
        {busy ? '…' : label}
        <input type="file" accept="image/*" onChange={handle} style={{ display: 'none' }} />
      </label>
      {err && <span className="error">{err}</span>}
    </div>
  );
}
