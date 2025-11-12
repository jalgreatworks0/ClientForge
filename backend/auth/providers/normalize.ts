import { OAuthProfile } from '../../types/auth/oauth';

import { adaptGoogle } from './google.adapter';
import { adaptMicrosoft } from './microsoft.adapter';

export function normalizeOAuthProfile(provider: 'google'|'microsoft', raw: Record<string, any>): OAuthProfile {
  switch (provider) {
    case 'google': return adaptGoogle(raw);
    case 'microsoft': return adaptMicrosoft(raw);
    default: throw new Error(`Unsupported provider: ${provider}`);
  }
}
