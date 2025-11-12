import { OAuthProfile, MicrosoftAdapter } from '../../types/auth/oauth';

export function adaptMicrosoft(raw: Record<string, any>): OAuthProfile {
  const email = raw?.mail ?? (raw?.userPrincipalName ?? raw?.email);
  const oid = raw?.oid ?? (raw?.id ?? raw?.sub); // support variants from MS Graph/AAD
  const name = raw?.displayName ?? (raw?.name ?? undefined);
  const picture: string | undefined = undefined; // can be fetched from Graph photo if needed later

  if (!email || !oid) {
    throw new Error('Invalid Microsoft profile: missing email or oid');
  }

  const out: MicrosoftAdapter = { kind: 'microsoft', email, name, picture, oid };
  return out;
}
