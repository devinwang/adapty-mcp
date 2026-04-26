import { redact } from '../utils/redact.js';

export interface AdaptyApiErrorInit {
  status: number;
  statusText?: string;
  requestId?: string;
  url: string;
  bodyExcerpt?: string;
}

export class AdaptyApiError extends Error {
  status: number;
  statusText?: string;
  requestId?: string;
  url: string;
  bodyExcerpt?: string;

  constructor(init: AdaptyApiErrorInit) {
    const summary = `Adapty API ${init.status}${init.statusText ? ' ' + init.statusText : ''} for ${init.url}`;
    super(summary);
    this.name = 'AdaptyApiError';
    this.status = init.status;
    if (init.statusText !== undefined) this.statusText = init.statusText;
    if (init.requestId !== undefined) this.requestId = init.requestId;
    this.url = init.url;
    if (init.bodyExcerpt !== undefined) this.bodyExcerpt = init.bodyExcerpt;
  }

  override toString(): string {
    return [
      `${this.name}: ${this.message}`,
      this.requestId ? `request_id=${this.requestId}` : '',
      this.bodyExcerpt ? `body=${redact(this.bodyExcerpt)}` : '',
    ].filter(Boolean).join(' | ');
  }
}

export async function normalizeErrorResponse(res: Response, url: string): Promise<AdaptyApiError> {
  let bodyExcerpt: string | undefined;
  try {
    const text = await res.text();
    bodyExcerpt = text.slice(0, 500);
  } catch {
    bodyExcerpt = undefined;
  }
  const init: AdaptyApiErrorInit = {
    status: res.status,
    statusText: res.statusText,
    url,
  };
  const reqId = res.headers.get('x-request-id');
  if (reqId) init.requestId = reqId;
  if (bodyExcerpt !== undefined) init.bodyExcerpt = bodyExcerpt;
  return new AdaptyApiError(init);
}
