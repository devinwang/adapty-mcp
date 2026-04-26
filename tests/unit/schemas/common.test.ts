import { describe, it, expect } from 'vitest';
import {
  ProfileIdSchema,
  CustomerUserIdSchema,
  PlatformSchema,
  AppParamSchema,
  EnvironmentParamSchema,
  ProfileTargetSchema,
  IsoDateTimeSchema,
} from '../../../src/schemas/common.js';

describe('ProfileIdSchema', () => {
  it('accepts UUIDs', () => { expect(() => ProfileIdSchema.parse('11111111-1111-1111-1111-111111111111')).not.toThrow(); });
  it('rejects empty', () => { expect(() => ProfileIdSchema.parse('')).toThrow(); });
});
describe('CustomerUserIdSchema', () => {
  it('accepts non-empty strings', () => { expect(() => CustomerUserIdSchema.parse('user-42')).not.toThrow(); });
  it('rejects empty', () => { expect(() => CustomerUserIdSchema.parse('')).toThrow(); });
});
describe('PlatformSchema', () => {
  it('accepts iOS / Android / web etc', () => {
    for (const p of ['iOS','macOS','iPadOS','visionOS','Android','web']) {
      expect(() => PlatformSchema.parse(p)).not.toThrow();
    }
  });
});
describe('ProfileTargetSchema', () => {
  it('requires exactly one of profileId or customerUserId', () => {
    expect(() => ProfileTargetSchema.parse({ profileId: 'x' })).not.toThrow();
    expect(() => ProfileTargetSchema.parse({ customerUserId: 'y' })).not.toThrow();
    expect(() => ProfileTargetSchema.parse({})).toThrow();
    expect(() => ProfileTargetSchema.parse({ profileId: 'x', customerUserId: 'y' })).toThrow();
  });
});
describe('AppParamSchema and EnvironmentParamSchema', () => {
  it('are both optional strings/enums', () => {
    expect(AppParamSchema.parse(undefined)).toBeUndefined();
    expect(EnvironmentParamSchema.parse('live')).toBe('live');
  });
});
describe('IsoDateTimeSchema', () => {
  it('accepts ISO strings', () => { expect(() => IsoDateTimeSchema.parse('2026-04-26T00:00:00Z')).not.toThrow(); });
  it('rejects non-ISO', () => { expect(() => IsoDateTimeSchema.parse('not a date')).toThrow(); });
});
