// Unit tests for the PostgREST search sanitizer (db/store.js -> buildIlikeOr).
//
// Run with: npm run test:unit  (or: node --test test/)
//
// These tests exercise pure string logic only — no DB is contacted. store.js
// imports lib/supabase.js, which throws at load time when Supabase env vars are
// missing, so we set throwaway values BEFORE importing. createClient is lazy and
// never opens a connection here, so this stays a true unit test.

import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.SUPABASE_URL ||= 'https://test.supabase.co';
process.env.SUPABASE_SECRET_KEY ||= 'test-secret-key';
process.env.SUPABASE_PUBLISHABLE_KEY ||= 'test-publishable-key';

const { buildIlikeOr } = await import('../db/store.js');

test('wraps a plain query in a quoted ilike pattern per column', () => {
  // Arrange
  const columns = ['name', 'region'];
  const raw = 'tbilisi';

  // Act
  const result = buildIlikeOr(columns, raw);

  // Assert
  assert.equal(result, 'name.ilike."%tbilisi%",region.ilike."%tbilisi%"');
});

test('joins multiple columns with a comma', () => {
  const result = buildIlikeOr(['title', 'author', 'genre'], 'rustaveli');
  assert.equal(
    result,
    'title.ilike."%rustaveli%",author.ilike."%rustaveli%",genre.ilike."%rustaveli%"',
  );
});

test('strips double quotes so the value cannot be terminated early', () => {
  // A stray double quote would otherwise close the quoted PostgREST value.
  const result = buildIlikeOr(['name'], 'ab"cd');
  assert.equal(result, 'name.ilike."%abcd%"');
  assert.ok(!result.includes('ab"cd'));
});

test('strips backslashes so the value cannot escape out of the quotes', () => {
  const result = buildIlikeOr(['name'], 'ab\\cd');
  // Backslash removed entirely (it is in the [\"\\] strip set).
  assert.equal(result, 'name.ilike."%abcd%"');
});

test('escapes LIKE wildcard percent so it is treated literally', () => {
  const result = buildIlikeOr(['name'], '50%');
  assert.equal(result, 'name.ilike."%50\\%%"');
});

test('escapes LIKE wildcard underscore so it is treated literally', () => {
  const result = buildIlikeOr(['name'], 'a_b');
  assert.equal(result, 'name.ilike."%a\\_b%"');
});

test('leaves PostgREST reserved chars (comma, parens, dot) literal inside the quoted value', () => {
  // These are only dangerous outside quotes; wrapping makes them safe, and the
  // sanitizer must NOT remove them (they are legitimate search characters).
  const result = buildIlikeOr(['name'], 'a,b(c).d');
  assert.equal(result, 'name.ilike."%a,b(c).d%"');
});

test('coerces a non-string query to a string before sanitizing', () => {
  const result = buildIlikeOr(['name'], 12345);
  assert.equal(result, 'name.ilike."%12345%"');
});

test('handles an empty query (matches everything via %%)', () => {
  const result = buildIlikeOr(['name'], '');
  assert.equal(result, 'name.ilike."%%"');
});

test('returns an empty string when no columns are supplied', () => {
  const result = buildIlikeOr([], 'anything');
  assert.equal(result, '');
});

test('neutralizes a combined injection attempt (quote + wildcard + backslash)', () => {
  const result = buildIlikeOr(['name'], '"); DROP%_\\');
  // " and \ stripped; % and _ escaped; the rest kept literal inside quotes.
  assert.equal(result, 'name.ilike."%); DROP\\%\\_%"');
  assert.ok(!result.includes('");'));
});
