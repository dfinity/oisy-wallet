// Mobile auth bridge (POC) — see docs/ai/spec-driven-development/specs/2026-07-10-feat-mobile-app-poc.md

export const MOBILE_AUTH_BRIDGE_PATH = '/mobile-auth';

export const MOBILE_AUTH_CALLBACK_URI = 'oisy://auth-callback';

// Exact-match allowlist: the bridge hands the delegation chain only to these
// URIs. Never widen this to a pattern — an attacker-controlled redirect URI
// would receive the user's delegation chain.
export const MOBILE_AUTH_ALLOWED_REDIRECT_URIS: readonly string[] = [MOBILE_AUTH_CALLBACK_URI];

export const MOBILE_AUTH_SESSION_PUBLIC_KEY_PARAM = 'sessionPublicKey';
export const MOBILE_AUTH_REDIRECT_URI_PARAM = 'redirectUri';
export const MOBILE_AUTH_DELEGATION_PARAM = 'delegation';

// POC value: re-authenticating through the system browser every hour (the web
// TTL) is unacceptable UX on mobile. The final TTL is a pending decision in
// the spec and must ship together with a biometric app lock.
export const MOBILE_AUTH_MAX_TIME_TO_LIVE = BigInt(30 * 24 * 60 * 60) * BigInt(1_000_000_000);

// Mirror of the auth client's internal `KEY_STORAGE_EXPIRATION` localStorage
// key (not exported by `@icp-sdk/auth`): it caches the delegation expiration
// so `AuthClient.isAuthenticated()` can answer synchronously. The native
// callback handler must populate it when persisting a bridge delegation.
export const MOBILE_AUTH_SESSION_EXPIRATION_STORAGE_KEY = 'ic-delegation_expiration';
