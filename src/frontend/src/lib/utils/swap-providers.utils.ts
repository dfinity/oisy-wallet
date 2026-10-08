import type {
	GetSupportedDestinationsFn,
	SwapCategorizedTokenIds,
	SwapTokenCategory
} from '$lib/types/swap';
import { resolveSwapTokenLookup } from '$lib/utils/swap-tokens-filter.utils';
import { isNullish } from '@dfinity/utils';

/**
 * Default `getSupportedDestinations` for symmetric same-category providers.
 *
 * Behavior:
 * - Source token's category does not match the provider's category → `undefined`
 *   (provider does not support the source).
 * - Provider has no supported-source list (e.g. Velora) → `{}` wildcard contributor.
 * - Source is in the provider's supported set → destinations = the same set in the
 *   provider's category.
 * - Source is not in the provider's supported set → `undefined`.
 */
export const buildSymmetricSupportedDestinations =
	(category: SwapTokenCategory): GetSupportedDestinationsFn =>
	({ sourceToken, supportedSourceTokens }): SwapCategorizedTokenIds | undefined => {
		const lookup = resolveSwapTokenLookup({ token: sourceToken });

		if (lookup?.category !== category) {
			return undefined;
		}

		if (isNullish(supportedSourceTokens)) {
			return {};
		}

		if (!supportedSourceTokens.has(lookup.identifier)) {
			return undefined;
		}

		return { [category]: supportedSourceTokens };
	};
