import {
	SwapProvider,
	type GetSupportedDestinationsFn,
	type SwapCategorizedTokenIds,
	type SwapTokenCategory
} from '$lib/types/swap';
import { resolveSwapTokenLookup } from '$lib/utils/swap-tokens-filter.utils';
import { nonNullish } from '@dfinity/utils';

// NEAR Intents bridges across EVM, SOL, and BTC but not ICP, so the builder is
// deliberately narrower than the full SwapTokenCategory.
type NearIntentsCategory = Extract<SwapTokenCategory, 'evm' | 'sol' | 'btc'>;

const NEAR_INTENTS_CATEGORIES: NearIntentsCategory[] = ['evm', 'sol', 'btc'];

/**
 * Builds a `getSupportedDestinations` for a NEAR Intents provider entry registered
 * under `category` ('evm', 'sol', or 'btc').
 *
 * NEAR Intents bridges across all its categories, but each provider entry only
 * caches its own category's source set. We use `findProviderSourceTokens` to look
 * up the sibling NEAR Intents entries' sets so the entry whose category matches the
 * source can advertise the union of all registered categories as reachable
 * destinations. Categories without a registered sibling entry are omitted.
 */
export const buildNearIntentsSupportedDestinations =
	(category: NearIntentsCategory): GetSupportedDestinationsFn =>
	({ sourceToken, supportedSourceTokens, findProviderSourceTokens }) => {
		const lookup = resolveSwapTokenLookup({ token: sourceToken });

		if (lookup?.category !== category || !supportedSourceTokens?.has(lookup.identifier)) {
			return;
		}

		return NEAR_INTENTS_CATEGORIES.reduce<SwapCategorizedTokenIds>((acc, destination) => {
			const set =
				destination === category
					? supportedSourceTokens
					: findProviderSourceTokens({ key: SwapProvider.NEAR_INTENTS, category: destination });

			return nonNullish(set) ? { ...acc, [destination]: set } : acc;
		}, {});
	};
