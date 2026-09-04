// Mobile auth bridge (POC) — see docs/ai/spec-driven-development/specs/2026-07-10-feat-mobile-app-poc.md

export const MOBILE_AUTH_BRIDGE_PATH = '/mobile-auth';

export const MOBILE_AUTH_CALLBACK_URI = 'oisy://auth-callback';

// Exact-match allowlist: the bridge hands the delegation chain only to these
// URIs. Never widen this to a pattern — an attacker-controlled redirect URI
// would receive the user's delegation chain.
export const MOBILE_AUTH_ALLOWED_REDIRECT_URIS: readonly string[] = [MOBILE_AUTH_CALLBACK_URI];

// ICRC-167 redirect transport (phase 2) — the app opens Internet Identity
// directly with an icrc34_delegation request; the delegation returns via a
// universal link on the canonical origin, so no bridge page is involved and
// no interceptable custom scheme carries the delegation.
// See https://github.com/dfinity/wg-identity-authentication/blob/main/topics/icrc_167_browser_url_transport.md
export const MOBILE_AUTH_II_TRANSPORT_URL = 'https://id.ai/authorize';

// Must match, byte-for-byte, an entry in /.well-known/ii-auth-callbacks and
// the universal-link path registered by the apps (AASA / assetlinks.json).
export const MOBILE_AUTH_REDIRECT_CALLBACK_PATH = '/signer-callback';

export const MOBILE_AUTH_ICRC167_MESSAGE_PARAM = 'message';
export const MOBILE_AUTH_ICRC167_CALLBACK_PARAM = 'callback';
export const MOBILE_AUTH_ICRC167_STATE_PARAM = 'state';

export const MOBILE_AUTH_SESSION_PUBLIC_KEY_PARAM = 'sessionPublicKey';
export const MOBILE_AUTH_REDIRECT_URI_PARAM = 'redirectUri';
export const MOBILE_AUTH_OPENID_PROVIDER_PARAM = 'openIdProvider';
export const MOBILE_AUTH_DELEGATION_PARAM = 'delegation';

// POC value: longer than the web's 1 h (re-authenticating through the system
// browser every hour is unacceptable UX on mobile) but deliberately short —
// with the POC's interceptable custom-scheme callback, the TTL bounds the
// damage of a stolen delegation (see the spec's threat model). The production
// TTL is a pending decision and must ship together with verified app links,
// hardware-backed key storage and a biometric app lock.
export const MOBILE_AUTH_MAX_TIME_TO_LIVE = BigInt(24 * 60 * 60) * BigInt(1_000_000_000);

// Mirror of the auth client's internal `KEY_STORAGE_EXPIRATION` localStorage
// key (not exported by `@icp-sdk/auth`): it caches the delegation expiration
// so `AuthClient.isAuthenticated()` can answer synchronously. The native
// callback handler must populate it when persisting a bridge delegation.
export const MOBILE_AUTH_SESSION_EXPIRATION_STORAGE_KEY = 'ic-delegation_expiration';
