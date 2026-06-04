// Donation status-transition rules — pure logic, no I/O.
//
// Kept separate from store.js (which instantiates the Supabase client at import
// time) so the rules can be unit-tested without any Supabase client, env vars,
// or network — and without coupling the test to a specific @supabase/* version.

export const DONATION_TRANSITIONS = {
  pending:      ['at_volunteer', 'in_transit', 'cancelled'],
  at_volunteer: ['in_transit', 'delivered', 'cancelled'],
  in_transit:   ['delivered', 'cancelled'],
  delivered:    [],
  cancelled:    [],
};

// Idempotent re-clicks (from === to) are allowed; genuine illegal jumps are not.
export function canTransition(from, to) {
  if (from === to) return true;
  return (DONATION_TRANSITIONS[from] || []).includes(to);
}
