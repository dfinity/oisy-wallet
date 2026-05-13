import {
	SwapProvider,
	type GetSupportedDestinationsFn,
	type SwapTokenCategory
} from '$lib/types/swap';
import { resolveSwapTokenLookup } from '$lib/utils/swap-tokens-filter.utils';
import { nonNullish } from '@dfinity/utils';

/**
 * Builds a `getSupportedDestinations` for a NEAR Intents provider entry registered
 * under `category` (either 'evm' or 'sol').
 *
 * NEAR Intents bridges across both EVM and SOL — but each provider entry only
 * caches its own category's source set. We use `findProviderSourceTokens` to look
 * up the sibling NEAR Intents entry's set so the entry whose category matches the
 * source can advertise the union { evm, sol } as reachable destinations.
 */
export const buildNearIntentsSupportedDestinations =
	(category: Extract<SwapTokenCategory, 'evm' | 'sol'>): GetSupportedDestinationsFn =>
	({ sourceToken, supportedSourceTokens, findProviderSourceTokens }) => {
		const lookup = resolveSwapTokenLookup({ token: sourceToken });

		if (lookup?.category !== category || !supportedSourceTokens?.has(lookup.identifier)) {
			return;
		}

		const evmSet =
			category === 'evm'
				? supportedSourceTokens
				: findProviderSourceTokens({ key: SwapProvider.NEAR_INTENTS, category: 'evm' });
		const solSet =
			category === 'sol'
				? supportedSourceTokens
				: findProviderSourceTokens({ key: SwapProvider.NEAR_INTENTS, category: 'sol' });

		const result: { evm?: Set<string>; sol?: Set<string> } = {};
		if (nonNullish(evmSet)) {
			result.evm = evmSet;
		}
		if (nonNullish(solSet)) {
			result.sol = solSet;
		}

		return result;
	};
