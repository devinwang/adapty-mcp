import { describe, it, expect } from 'vitest';
import { redact } from '../../../src/utils/redact.js';

describe('redact', () => {
  it('masks secret_live keys keeping prefix and last 4', () => {
    expect(redact('secret_live_abcdef12345.tail9999'))
      .toBe('secret_live_***9999');
  });
  it('masks secret_stag keys', () => {
    expect(redact('secret_stag_abcdef12345.tail9999'))
      .toBe('secret_stag_***9999');
  });
  it('masks public_live keys', () => {
    expect(redact('public_live_abcdef12345.tail9999'))
      .toBe('public_live_***9999');
  });
  it('masks public_stag keys', () => {
    expect(redact('public_stag_xyz.0000'))
      .toBe('public_stag_***0000');
  });
  it('redacts inline within larger strings', () => {
    expect(redact('Authorization: Api-Key secret_live_aaaaaaaa.bbbb1234 ok'))
      .toBe('Authorization: Api-Key secret_live_***1234 ok');
  });
  it('handles multiple occurrences', () => {
    expect(redact('a=secret_live_aaaa.1111 b=public_live_bbbb.2222'))
      .toBe('a=secret_live_***1111 b=public_live_***2222');
  });
  it('leaves non-key strings untouched', () => {
    expect(redact('hello world')).toBe('hello world');
  });
  it('returns empty string for empty input', () => {
    expect(redact('')).toBe('');
  });
  it('redacts inside JSON via redactJson', async () => {
    const { redactJson } = await import('../../../src/utils/redact.js');
    const out = redactJson({ key: 'secret_live_xxxx.zzzz9999', other: 1 });
    expect(out).toEqual({ key: 'secret_live_***9999', other: 1 });
  });
  it('redactJson recurses into nested objects and arrays', async () => {
    const { redactJson } = await import('../../../src/utils/redact.js');
    expect(redactJson({ a: ['secret_live_xx.tt0001'] }))
      .toEqual({ a: ['secret_live_***0001'] });
  });
});
