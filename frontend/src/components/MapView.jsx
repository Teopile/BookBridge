import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { useT } from '../i18n/I18nContext.jsx';

/**
 * Fix Leaflet's default marker icons under Vite/Webpack — without this they 404.
 * Use the standard Leaflet CDN PNGs.
 */
const DefaultIcon = L.icon({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize:      [25, 41],
  iconAnchor:    [12, 41],
  popupAnchor:   [1, -34],
  shadowSize:    [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Approximate center of Georgia, low zoom — covers Tbilisi to mountain regions.
const DEFAULT_CENTER = [42.1, 43.7];
const DEFAULT_ZOOM = 7;

export default function MapView({ schools }) {
  const { t, lang } = useT();
  const prefix = '/' + lang;

  // Only show schools with valid coordinates.
  const placed = useMemo(
    () => (schools || []).filter((s) => typeof s.lat === 'number' && typeof s.lng === 'number'),
    [schools],
  );

  const center = placed.length === 1 ? [placed[0].lat, placed[0].lng] : DEFAULT_CENTER;
  const zoom   = placed.length === 1 ? 11 : DEFAULT_ZOOM;

  if (placed.length === 0) {
    return (
      <div className="state">
        <div className="state-icon">📍</div>
        <h3>{t('schools.mapEmpty')}</h3>
        <p>{t('schools.mapEmptyHint')}</p>
      </div>
    );
  }

  return (
    <div style={{
      height: 520,
      borderRadius: 14,
      overflow: 'hidden',
      border: '1px solid var(--gray-200)',
      boxShadow: 'var(--sh-1)',
    }}>
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {placed.map((s) => (
          <Marker key={s.id} position={[s.lat, s.lng]}>
            <Popup>
              <div style={{ minWidth: 180 }}>
                <strong>{s.name}</strong>
                <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                  {s.region}{s.city ? ' · ' + s.city : ''}
                </div>
                <Link
                  to={prefix + '/schools/' + s.id}
                  style={{ display: 'inline-block', marginTop: 8, color: '#2D8B7A', fontWeight: 600, fontSize: 13 }}
                >
                  {t('schools.viewDetails')} →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
