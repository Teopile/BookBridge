// Unit tests for the donation status-transition guard (db/transitions.js).
//
// Run with: npm run test:unit
//
// Imports the pure rules module directly — no Supabase client, env vars, or
// network — so this is a hermetic unit test that can't be broken by missing
// env or a future @supabase/* version bump.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canTransition, DONATION_TRANSITIONS } from '../db/transitions.js';

test('allows the forward lifecycle steps a hub/school can perform', () => {
  assert.equal(canTransition('pending', 'at_volunteer'), true);
  assert.equal(canTransition('at_volunteer', 'in_transit'), true);
  assert.equal(canTransition('at_volunteer', 'delivered'), true); // hand-delivery
  assert.equal(canTransition('in_transit', 'delivered'), true);
});

test('rejects illegal rewinds and skips', () => {
  assert.equal(canTransition('in_transit', 'at_volunteer'), false); // rewind
  assert.equal(canTransition('in_transit', 'pending'), false);
  assert.equal(canTransition('at_volunteer', 'pending'), false);
  assert.equal(canTransition('pending', 'delivered'), false); // can't skip the hub
});

test('terminal states cannot transition onward', () => {
  assert.equal(canTransition('delivered', 'in_transit'), false);
  assert.equal(canTransition('delivered', 'cancelled'), false);
  assert.equal(canTransition('cancelled', 'at_volunteer'), false);
  assert.deepEqual(DONATION_TRANSITIONS.delivered, []);
  assert.deepEqual(DONATION_TRANSITIONS.cancelled, []);
});

test('cancellation is allowed from any active state', () => {
  assert.equal(canTransition('pending', 'cancelled'), true);
  assert.equal(canTransition('at_volunteer', 'cancelled'), true);
  assert.equal(canTransition('in_transit', 'cancelled'), true);
});

test('idempotent re-click (from === to) is allowed', () => {
  assert.equal(canTransition('at_volunteer', 'at_volunteer'), true);
  assert.equal(canTransition('delivered', 'delivered'), true);
});

test('unknown source status never transitions', () => {
  assert.equal(canTransition('bogus', 'delivered'), false);
});
