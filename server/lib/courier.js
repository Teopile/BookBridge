// Courier integration.
//
// LAUNCH MODE: COURIER_PROVIDER=manual (default). Logistics are handled by
// people, not an API — a donor drops books at a volunteer hub and the hub
// forwards them to the school. There is NO automated carrier, so we do NOT
// fabricate a tracking number: tracking_id is null until a human enters a real
// one (e.g. a parcel receipt) on the hub's manage page. Real carrier adapters
// (yandex/linex/…) can be added later behind this same interface.

export async function createShipment({ origin, destination, items, donorContact } = {}) {
  const provider = (process.env.COURIER_PROVIDER || 'manual').toLowerCase();

  if (provider === 'manual') {
    // No carrier booked. The donation is real; tracking is added by hand later.
    return { tracking_id: null, status: 'pending', provider: 'manual' };
  }

  if (provider === 'yandex') throw new Error('yandex provider not implemented yet');
  if (provider === 'linex') throw new Error('linex provider not implemented yet');

  throw new Error(`Unknown COURIER_PROVIDER=${provider}`);
}

export async function getShipmentStatus(trackingId) {
  const provider = (process.env.COURIER_PROVIDER || 'manual').toLowerCase();
  if (provider === 'manual') {
    // Status is advanced manually by the hub/school, not polled from a carrier.
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
