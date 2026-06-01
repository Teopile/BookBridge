// Unit tests for Zod request schemas (schemas.js).
//
// Run with: npm run test:unit  (or: node --test test/)
//
// schemas.js has no DB or env dependency, so it imports cleanly. We assert both
// the accept path (valid payloads parse and apply defaults) and the reject path
// (invalid payloads fail) for the donation and search schemas plus a couple of
// closely related ones.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  DonationCreateSchema,
  SearchSchema,
  MonetaryDonationSchema,
  RegisterSchema,
} from '../schemas.js';

const VALID_UUID = '11111111-1111-1111-1111-111111111111';

// ---------- DonationCreateSchema ----------

test('DonationCreateSchema accepts a minimal valid donation', () => {
  // Arrange
  const payload = {
    beneficiary_school_id: VALID_UUID,
    delivery_method: 'self',
    items: [{ book_title: 'The Knight in the Panther Skin', quantity: 2 }],
  };

  // Act
  const result = DonationCreateSchema.safeParse(payload);

  // Assert
  assert.equal(result.success, true);
  assert.equal(result.data.items[0].quantity, 2);
});

test('DonationCreateSchema rejects a missing beneficiary_school_id', () => {
  const result = DonationCreateSchema.safeParse({
    delivery_method: 'courier',
    items: [{ quantity: 1 }],
  });
  assert.equal(result.success, false);
});

test('DonationCreateSchema rejects a non-uuid beneficiary_school_id', () => {
  const result = DonationCreateSchema.safeParse({
    beneficiary_school_id: 'not-a-uuid',
    delivery_method: 'self',
    items: [{ quantity: 1 }],
  });
  assert.equal(result.success, false);
});

test('DonationCreateSchema rejects an empty items array', () => {
  const result = DonationCreateSchema.safeParse({
    beneficiary_school_id: VALID_UUID,
    delivery_method: 'self',
    items: [],
  });
  assert.equal(result.success, false);
});

test('DonationCreateSchema rejects a non-positive item quantity', () => {
  const result = DonationCreateSchema.safeParse({
    beneficiary_school_id: VALID_UUID,
    delivery_method: 'self',
    items: [{ quantity: 0 }],
  });
  assert.equal(result.success, false);
});

test('DonationCreateSchema rejects an invalid delivery_method', () => {
  const result = DonationCreateSchema.safeParse({
    beneficiary_school_id: VALID_UUID,
    delivery_method: 'teleport',
    items: [{ quantity: 1 }],
  });
  assert.equal(result.success, false);
});

// ---------- SearchSchema ----------

test('SearchSchema applies the default type of "all"', () => {
  const result = SearchSchema.safeParse({ q: 'books' });
  assert.equal(result.success, true);
  assert.equal(result.data.type, 'all');
});

test('SearchSchema accepts a valid explicit type', () => {
  const result = SearchSchema.safeParse({ q: 'school', type: 'beneficiary' });
  assert.equal(result.success, true);
  assert.equal(result.data.type, 'beneficiary');
});

test('SearchSchema rejects an empty query string', () => {
  const result = SearchSchema.safeParse({ q: '' });
  assert.equal(result.success, false);
});

test('SearchSchema rejects an unknown type', () => {
  const result = SearchSchema.safeParse({ q: 'books', type: 'magazine' });
  assert.equal(result.success, false);
});

// ---------- MonetaryDonationSchema ----------

test('MonetaryDonationSchema defaults currency to GEL', () => {
  const result = MonetaryDonationSchema.safeParse({ amount_minor: 5000 });
  assert.equal(result.success, true);
  assert.equal(result.data.currency, 'GEL');
});

test('MonetaryDonationSchema rejects a non-integer amount', () => {
  const result = MonetaryDonationSchema.safeParse({ amount_minor: 12.5 });
  assert.equal(result.success, false);
});

test('MonetaryDonationSchema rejects a negative amount', () => {
  const result = MonetaryDonationSchema.safeParse({ amount_minor: -100 });
  assert.equal(result.success, false);
});

// ---------- RegisterSchema ----------

test('RegisterSchema accepts a valid registration and defaults language to en', () => {
  const result = RegisterSchema.safeParse({
    email: 'donor@example.com',
    username: 'book_donor-1',
    password: 'supersecret',
  });
  assert.equal(result.success, true);
  assert.equal(result.data.language, 'en');
});

test('RegisterSchema rejects a short password', () => {
  const result = RegisterSchema.safeParse({
    email: 'donor@example.com',
    username: 'donor',
    password: 'short',
  });
  assert.equal(result.success, false);
});

test('RegisterSchema rejects a username with illegal characters', () => {
  const result = RegisterSchema.safeParse({
    email: 'donor@example.com',
    username: 'bad name!',
    password: 'supersecret',
  });
  assert.equal(result.success, false);
});

test('RegisterSchema rejects an invalid email', () => {
  const result = RegisterSchema.safeParse({
    email: 'not-an-email',
    username: 'donor',
    password: 'supersecret',
  });
  assert.equal(result.success, false);
});
