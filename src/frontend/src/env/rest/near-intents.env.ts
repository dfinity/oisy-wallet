import { LOCAL, STAGING, TEST } from '$lib/constants/app.constants';
import { UrlSchema } from '$lib/validation/url.validation';
import { safeParse } from '$lib/validation/utils.validation';

export const NEAR_INTENTS_SWAP_ENABLED = true;

export const NEAR_INTENTS_BTC_SWAP_ENABLED = true;

// NEAR Intents swaps from and to native XRP, tested on local and staging before they reach users.
// Off in unit tests too, so suite-wide swap expectations stay what they are until the flag is
// turned on everywhere; the tests of the feature itself switch it on.
export const NEAR_INTENTS_XRP_SWAP_ENABLED = (LOCAL || STAGING) && !TEST;

// Apparently we do not need any API keys for Near Intents; we can make unauthorised calls
export const NEAR_INTENTS_API_KEY = import.meta.env.VITE_NEAR_INTENTS_API_KEY;

export const NEAR_INTENTS_API_URL = safeParse({
	schema: UrlSchema,
	value: 'https://1click.chaindefuser.com/v0'
});

/**
 * SHA-256 hex digest of the 1Click Swap API Terms of Service (markdown source).
 *
 * Recompute after every terms update with:
 *   curl -sL https://docs.near-intents.org/security-compliance/terms-of-service.md | sha256sum
 */
export const NEAR_INTENTS_TOS_SHA256 =
	'cd633c9be2556d7e1ed9bde2d5b959898d975dca47c006bccb5b567ba26d5d75';

/**
 * Ed25519 public key the 1Click service signs its quote responses with.
 *
 * Pinned from the official SDK, which hard-codes the same value:
 * https://github.com/defuse-protocol/one-click-sdk-typescript/blob/main/src/quote-signature.ts
 *
 * A quote names the deposit address the wallet irreversibly sends funds to, so it is
 * verified against this key before any transfer rather than trusted on the TLS hop alone.
 */
export const NEAR_INTENTS_QUOTE_PUBLIC_KEY = 'ed25519:reYaWhvwu8Jzo3WUM3zhn6VrhuMEF4eADL17qtRVifc';
