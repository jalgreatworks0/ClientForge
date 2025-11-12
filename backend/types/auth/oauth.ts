export interface OAuthProfileBase {
  provider: 'google' | 'microsoft';
  email: string;
  emailVerified?: boolean;
  name?: string;
  picture?: string;
  sub?: string;       // google subject
  oid?: string;       // microsoft object id
}

export type GoogleRaw = Record<string, unknown>;
export type MicrosoftRaw = Record<string, unknown>;

export interface GoogleAdapter {
  kind: 'google';
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
  sub: string;
}

export interface MicrosoftAdapter {
  kind: 'microsoft';
  email: string;
  name?: string;
  picture?: string;
  oid: string;
}

export type OAuthProfile = GoogleAdapter | MicrosoftAdapter;

export function isGoogle(raw: unknown): raw is GoogleAdapter {
  const o = raw as any;
  return o && typeof o === 'object' && o.kind === 'google' && typeof o.email === 'string' && typeof o.sub === 'string';
}

export function isMicrosoft(raw: unknown): raw is MicrosoftAdapter {
  const o = raw as any;
  return o && typeof o === 'object' && o.kind === 'microsoft' && typeof o.email === 'string' && typeof o.oid === 'string';
}
