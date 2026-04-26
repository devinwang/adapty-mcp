import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mkdtempSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAccountStore, ConfigError } from '../../../src/auth/account-store.js';

function tmpConfig(json: string, mode = 0o600): string {
  const dir = mkdtempSync(join(tmpdir(), 'adapty-mcp-'));
  const file = join(dir, 'accounts.json');
  writeFileSync(file, json);
  chmodSync(file, mode);
  return file;
}

describe('createAccountStore', () => {
  beforeEach(() => {
    delete process.env.ADAPTY_SECRET_API_KEY;
    delete process.env.ADAPTY_PUBLIC_API_KEY;
    delete process.env.ADAPTY_SECRET_API_KEY_SANDBOX;
    delete process.env.ADAPTY_PUBLIC_API_KEY_SANDBOX;
    delete process.env.ADAPTY_MCP_CONFIG;
  });

  describe('env-var mode', () => {
    it('resolves live from ADAPTY_SECRET_API_KEY when no app/env provided', () => {
      process.env.ADAPTY_SECRET_API_KEY = 'secret_live_aa.bb';
      const store = createAccountStore();
      const c = store.resolve({});
      expect(c.environment).toBe('live');
      expect(c.secretKey).toBe('secret_live_aa.bb');
    });
    it('throws when sandbox requested without sandbox vars', () => {
      process.env.ADAPTY_SECRET_API_KEY = 'secret_live_aa.bb';
      const store = createAccountStore();
      expect(() => store.resolve({ environment: 'sandbox' })).toThrow(ConfigError);
    });
    it('exposes publicKey when ADAPTY_PUBLIC_API_KEY set', () => {
      process.env.ADAPTY_SECRET_API_KEY = 'secret_live_aa.bb';
      process.env.ADAPTY_PUBLIC_API_KEY = 'public_live_aa.bb';
      const c = createAccountStore().resolve({});
      expect(c.publicKey).toBe('public_live_aa.bb');
    });
    it('throws ConfigError when no env vars and no config', () => {
      const store = createAccountStore();
      expect(() => store.resolve({})).toThrow(ConfigError);
    });
  });

  describe('config-file mode', () => {
    it('resolves default app live when nothing specified', () => {
      const file = tmpConfig(JSON.stringify({
        default: 'main',
        apps: { main: { live: { secretKey: 'secret_live_a.b' } } },
      }));
      const store = createAccountStore({ configPath: file });
      const c = store.resolve({});
      expect(c.app).toBe('main');
      expect(c.environment).toBe('live');
    });
    it('falls back to sandbox when live missing for that app', () => {
      const file = tmpConfig(JSON.stringify({
        default: 'main',
        apps: { main: { sandbox: { secretKey: 'secret_stag_a.b' } } },
      }));
      const c = createAccountStore({ configPath: file }).resolve({});
      expect(c.environment).toBe('sandbox');
    });
    it('throws when requested app does not exist', () => {
      const file = tmpConfig(JSON.stringify({
        apps: { main: { live: { secretKey: 'secret_live_a.b' } } },
      }));
      const store = createAccountStore({ configPath: file });
      expect(() => store.resolve({ app: 'unknown' })).toThrow(ConfigError);
    });
    it('throws when no app param and no default', () => {
      const file = tmpConfig(JSON.stringify({
        apps: {
          a: { live: { secretKey: 'secret_live_a.b' } },
          b: { live: { secretKey: 'secret_live_c.d' } },
        },
      }));
      const store = createAccountStore({ configPath: file });
      expect(() => store.resolve({})).toThrow(/default/);
    });
    it('throws when requested environment missing for app', () => {
      const file = tmpConfig(JSON.stringify({
        default: 'main',
        apps: { main: { live: { secretKey: 'secret_live_a.b' } } },
      }));
      const store = createAccountStore({ configPath: file });
      expect(() => store.resolve({ environment: 'sandbox' })).toThrow(ConfigError);
    });
    it('does NOT silently fall back to env vars when config is present', () => {
      process.env.ADAPTY_SECRET_API_KEY = 'secret_live_x.y';
      const file = tmpConfig(JSON.stringify({
        default: 'main',
        apps: { main: { live: { secretKey: 'secret_live_a.b' } } },
      }));
      const c = createAccountStore({ configPath: file }).resolve({});
      expect(c.secretKey).toBe('secret_live_a.b');
    });
    it('warns when file mode is too open', () => {
      const warn = vi.spyOn(console, 'error').mockImplementation(() => {});
      const file = tmpConfig(JSON.stringify({
        apps: { main: { live: { secretKey: 'secret_live_a.b' } } },
      }), 0o644);
      createAccountStore({ configPath: file });
      expect(warn).toHaveBeenCalledWith(expect.stringMatching(/permissions/i));
      warn.mockRestore();
    });
    it('throws on malformed JSON', () => {
      const file = tmpConfig('not json');
      expect(() => createAccountStore({ configPath: file })).toThrow(ConfigError);
    });
    it('throws on schema-invalid config', () => {
      const file = tmpConfig(JSON.stringify({ apps: {} }));
      expect(() => createAccountStore({ configPath: file })).toThrow(ConfigError);
    });
  });
});
