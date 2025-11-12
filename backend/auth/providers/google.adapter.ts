import { OAuthProfile, GoogleAdapter } from '../../types/auth/oauth';

export function adaptGoogle(raw: Record<string, any>): OAuthProfile {
  const email = raw?.email ?? raw?.emails?.[0]?.value;
  const sub = raw?.sub ?? (raw?.id ?? raw?.userId);
  const emailVerified = Boolean(raw?.email_verified ?? (raw?.verified_email ?? false));
  const name = raw?.name ?? ([raw?.given_name, raw?.family_name].filter(Boolean).join(' ') || undefined);
  const picture = raw?.picture ?? raw?.photos?.[0]?.value;

  if (!email || !sub) {
    throw new Error('Invalid Google profile: missing email or sub');
  }

  const out: GoogleAdapter = { kind: 'google', email, emailVerified, name, picture, sub };
  return out;
}
