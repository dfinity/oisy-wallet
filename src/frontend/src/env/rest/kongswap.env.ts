import { UrlSchema } from '$lib/validation/url.validation';
import { safeParse } from '$lib/validation/utils.validation';

export const KONGSWAP_API_URL = safeParse({
	schema: UrlSchema,
	value: 'https://api.kongswap.io/api'
});

// KongSwap is no longer available to use - the product got sunsetted.
// However, there is a chance that they'll come back in the future.
// Therefore, we just disable this swap provider with a feature flag.
export const KONGSWAP_PROVIDER_ENABLED = false;
