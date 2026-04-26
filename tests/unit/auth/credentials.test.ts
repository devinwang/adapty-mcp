import { describe, it, expect } from 'vitest';
import {
  AdaptyEnvironmentSchema,
  AdaptyKeyPairSchema,
  AdaptyAppConfigSchema,
  AdaptyAccountsConfigSchema,
} from '../../../src/auth/credentials.js';

describe('AdaptyEnvironmentSchema', () => {
  it('accepts live and sandbox', () => {
    expect(AdaptyEnvironmentSchema.parse('live')).toBe('live');
    expect(AdaptyEnvironmentSchema.parse('sandbox')).toBe('sandbox');
  });
  it('rejects other values', () => {
    expect(() => AdaptyEnvironmentSchema.parse('prod')).toThrow();
  });
});

describe('AdaptyKeyPairSchema', () => {
  it('accepts a secret-only pair', () => {
    expect(() => AdaptyKeyPairSchema.parse({ secretKey: 'secret_live_aaa.bbb' })).not.toThrow();
  });
  it('accepts a public-only pair', () => {
    expect(() => AdaptyKeyPairSchema.parse({ publicKey: 'public_live_aaa.bbb' })).not.toThrow();
  });
  it('rejects a pair with neither key', () => {
    expect(() => AdaptyKeyPairSchema.parse({})).toThrow();
  });
  it('rejects malformed secret key prefix', () => {
    expect(() => AdaptyKeyPairSchema.parse({ secretKey: 'wrong_prefix_x' })).toThrow();
  });
});

describe('AdaptyAppConfigSchema', () => {
  it('accepts an app with only live', () => {
    expect(() => AdaptyAppConfigSchema.parse({ live: { secretKey: 'secret_live_a.b' } })).not.toThrow();
  });
  it('accepts an app with both envs', () => {
    expect(() => AdaptyAppConfigSchema.parse({
      live: { secretKey: 'secret_live_a.b' },
      sandbox: { secretKey: 'secret_stag_a.b' },
    })).not.toThrow();
  });
  it('rejects an app with no envs', () => {
    expect(() => AdaptyAppConfigSchema.parse({})).toThrow();
  });
});

describe('AdaptyAccountsConfigSchema', () => {
  it('accepts a complete config', () => {
    const cfg = {
      default: 'a',
      apps: {
        a: { live: { secretKey: 'secret_live_x.y' } },
        b: { sandbox: { secretKey: 'secret_stag_x.y' } },
      },
    };
    expect(() => AdaptyAccountsConfigSchema.parse(cfg)).not.toThrow();
  });
  it('rejects when default points at unknown app', () => {
    const cfg = { default: 'missing', apps: { a: { live: { secretKey: 'secret_live_x.y' } } } };
    expect(() => AdaptyAccountsConfigSchema.parse(cfg)).toThrow();
  });
  it('rejects when default is a prototype method name', () => {
    const cfg = { default: 'toString', apps: { a: { live: { secretKey: 'secret_live_x.y' } } } };
    expect(() => AdaptyAccountsConfigSchema.parse(cfg)).toThrow();
  });
  it('makes default optional', () => {
    expect(() => AdaptyAccountsConfigSchema.parse({
      apps: { a: { live: { secretKey: 'secret_live_x.y' } } },
    })).not.toThrow();
  });
});
