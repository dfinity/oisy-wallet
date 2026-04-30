import { UrlSchema } from '$lib/validation/url.validation';
import { safeParse } from '$lib/validation/utils.validation';

export const NEAR_INTENTS_SWAP_ENABLED = true;

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
