import { existsSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  AdaptyAccountsConfigSchema,
  type AdaptyAccountsConfig,
  type AdaptyEnvironment,
  type ResolvedCredentials,
} from './credentials.js';

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export interface ResolveInput {
  app?: string;
  environment?: AdaptyEnvironment;
}

export interface AccountStore {
  resolve(input: ResolveInput): ResolvedCredentials;
}

export interface AccountStoreOptions {
  configPath?: string;
}

function defaultConfigPath(): string {
  if (process.env.ADAPTY_MCP_CONFIG) return process.env.ADAPTY_MCP_CONFIG;
  return join(homedir(), '.config', 'adapty-mcp', 'accounts.json');
}

function loadConfig(path: string): AdaptyAccountsConfig {
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch (e) {
    throw new ConfigError(`failed to read ${path}: ${(e as Error).message}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new ConfigError(`config at ${path} is not valid JSON: ${(e as Error).message}`);
  }
  const result = AdaptyAccountsConfigSchema.safeParse(parsed);
  if (!result.success) throw new ConfigError(`invalid config at ${path}: ${result.error.message}`);
  return result.data;
}

function checkPermissions(path: string): void {
  try {
    const mode = statSync(path).mode & 0o777;
    if (mode & 0o077) {
      console.error(`adapty-mcp: warning — config file ${path} has loose permissions (${mode.toString(8)}); recommend chmod 600`);
    }
  } catch {
    // best-effort; ignore
  }
}

function fromConfig(cfg: AdaptyAccountsConfig, input: ResolveInput): ResolvedCredentials {
  const app = input.app ?? cfg.default;
  if (!app) {
    const known = Object.keys(cfg.apps).join(', ');
    throw new ConfigError(`no app param and no default in config; known apps: ${known}`);
  }
  const appCfg = cfg.apps[app];
  if (!appCfg) {
    const known = Object.keys(cfg.apps).join(', ');
    throw new ConfigError(`unknown app '${app}'; known apps: ${known}`);
  }
  let env: AdaptyEnvironment;
  if (input.environment) {
    env = input.environment;
  } else {
    env = appCfg.live ? 'live' : 'sandbox';
  }
  const pair = appCfg[env];
  if (!pair) throw new ConfigError(`app '${app}' has no '${env}' credentials configured`);
  const out: ResolvedCredentials = { app, environment: env };
  if (pair.secretKey) out.secretKey = pair.secretKey;
  if (pair.publicKey) out.publicKey = pair.publicKey;
  return out;
}

function fromEnv(input: ResolveInput): ResolvedCredentials {
  const env = input.environment ?? 'live';
  const secret = env === 'sandbox'
    ? process.env.ADAPTY_SECRET_API_KEY_SANDBOX
    : process.env.ADAPTY_SECRET_API_KEY;
  const pub = env === 'sandbox'
    ? process.env.ADAPTY_PUBLIC_API_KEY_SANDBOX
    : process.env.ADAPTY_PUBLIC_API_KEY;
  if (!secret && !pub) {
    throw new ConfigError(
      env === 'sandbox'
        ? 'no sandbox env vars set (ADAPTY_SECRET_API_KEY_SANDBOX / ADAPTY_PUBLIC_API_KEY_SANDBOX) and no config file found'
        : 'no env vars set (ADAPTY_SECRET_API_KEY / ADAPTY_PUBLIC_API_KEY) and no config file found',
    );
  }
  const out: ResolvedCredentials = { app: 'env', environment: env };
  if (secret) out.secretKey = secret;
  if (pub) out.publicKey = pub;
  return out;
}

export function createAccountStore(opts: AccountStoreOptions = {}): AccountStore {
  const configPath = opts.configPath ?? defaultConfigPath();
  const haveConfig = existsSync(configPath);
  let cfg: AdaptyAccountsConfig | null = null;
  if (haveConfig) {
    checkPermissions(configPath);
    cfg = loadConfig(configPath);
  }
  return {
    resolve(input) {
      return cfg ? fromConfig(cfg, input) : fromEnv(input);
    },
  };
}
