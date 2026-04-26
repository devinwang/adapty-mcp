import { z } from 'zod';

export const AdaptyEnvironmentSchema = z.enum(['live', 'sandbox']);
export type AdaptyEnvironment = z.infer<typeof AdaptyEnvironmentSchema>;

const SECRET_KEY_RE = /^secret_(live|stag)_[A-Za-z0-9._-]+$/;
const PUBLIC_KEY_RE = /^public_(live|stag)_[A-Za-z0-9._-]+$/;

const SecretKeySchema = z.string().regex(SECRET_KEY_RE, 'must look like secret_live_... or secret_stag_...');
const PublicKeySchema = z.string().regex(PUBLIC_KEY_RE, 'must look like public_live_... or public_stag_...');

export const AdaptyKeyPairSchema = z.object({
  secretKey: SecretKeySchema.optional(),
  publicKey: PublicKeySchema.optional(),
}).refine(v => v.secretKey || v.publicKey, { message: 'at least one of secretKey or publicKey is required' });
export type AdaptyKeyPair = z.infer<typeof AdaptyKeyPairSchema>;

export const AdaptyAppConfigSchema = z.object({
  live: AdaptyKeyPairSchema.optional(),
  sandbox: AdaptyKeyPairSchema.optional(),
}).refine(v => v.live || v.sandbox, { message: 'app must define at least one of live or sandbox' });
export type AdaptyAppConfig = z.infer<typeof AdaptyAppConfigSchema>;

export const AdaptyAccountsConfigSchema = z.object({
  default: z.string().optional(),
  apps: z.record(z.string(), AdaptyAppConfigSchema),
}).refine(
  cfg => cfg.default === undefined || Object.hasOwn(cfg.apps, cfg.default),
  { message: 'default must reference one of the apps' },
);
export type AdaptyAccountsConfig = z.infer<typeof AdaptyAccountsConfigSchema>;

export interface ResolvedCredentials {
  app: string;
  environment: AdaptyEnvironment;
  secretKey?: string;
  publicKey?: string;
}
