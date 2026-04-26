import type { ResolvedCredentials } from './credentials.js';

export type AdaptyPlatform = 'iOS' | 'macOS' | 'iPadOS' | 'visionOS' | 'Android' | 'web';

export interface BuildHeadersInput {
  credentials: ResolvedCredentials;
  keyType: 'secret' | 'public';
  profileId?: string;
  customerUserId?: string;
  platform?: AdaptyPlatform;
  allowAnonymous?: boolean;
}

export type RequestHeaders = Record<string, string>;

export function buildHeaders(input: BuildHeadersInput): RequestHeaders {
  const { credentials, keyType, profileId, customerUserId, platform, allowAnonymous } = input;
  const key = keyType === 'secret' ? credentials.secretKey : credentials.publicKey;
  if (!key) throw new Error(`no ${keyType}Key available for app '${credentials.app}' (${credentials.environment})`);
  if (profileId && customerUserId) {
    throw new Error('pass exactly one of profileId or customerUserId, not both');
  }
  if (!profileId && !customerUserId && !allowAnonymous) {
    throw new Error('one of adapty-profile-id or adapty-customer-user-id is required');
  }
  const h: RequestHeaders = {
    Authorization: `Api-Key ${key}`,
    'Content-Type': 'application/json',
  };
  if (profileId) h['adapty-profile-id'] = profileId;
  if (customerUserId) h['adapty-customer-user-id'] = customerUserId;
  if (platform) h['adapty-platform'] = platform;
  return h;
}
