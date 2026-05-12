// Courier API stub. Real integration depends on which courier is signed.
// MVP: COURIER_PROVIDER=manual stores order details and returns a placeholder tracking ID.

export async function createShipment({ origin, destination, items, donorContact } = {}) {
  const provider = (process.env.COURIER_PROVIDER || 'manual').toLowerCase();

  if (provider === 'manual') {
    return {
      tracking_id: `MANUAL-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      status: 'pending',
      provider: 'manual',
    };
  }

  if (provider === 'yandex') throw new Error('yandex provider not implemented yet');
  if (provider === 'linex') throw new Error('linex provider not implemented yet');

  throw new Error(`Unknown COURIER_PROVIDER=${provider}`);
}

export async function getShipmentStatus(trackingId) {
  const provider = (process.env.COURIER_PROVIDER || 'manual').toLowerCase();
  if (provider === 'manual') {
    return { tracking_id: trackingId, status: 'pending', updated_by: 'manual' };
  }
  throw new Error(`getShipmentStatus not implemented for ${provider}`);
}

export function mapCourierStatus(courierStatus) {
  const s = (courierStatus || '').toLowerCase();
  if (['created', 'pending', 'registered'].includes(s)) return 'at_volunteer';
  if (['picked_up', 'in_transit', 'shipped', 'sorting'].includes(s)) return 'in_transit';
  if (['delivered', 'completed'].includes(s)) return 'delivered';
  if (['cancelled', 'returned'].includes(s)) return 'cancelled';
  return null;
}
