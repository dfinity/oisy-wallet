import { evmSwapProviders } from '$lib/providers/evm-swap.providers';
import { icpBridgeProviders } from '$lib/providers/icp-bridge-swap.providers';
import { solSwapProviders } from '$lib/providers/sol-swap.providers';
import { swapProviders } from '$lib/providers/swap.providers';
import {
	swapSupportedTokensStore,
	type SwapProviderSupport,
	type SwapSupportedTokensData,
	type SwapSupportedTokensInfo
} from '$lib/stores/swap-supported-tokens.store';
import type { GetSupportedDestinationsFn, SwapProvider, SwapTokenCategory } from '$lib/types/swap';
import { determineCoverage } from '$lib/utils/swap-tokens-filter.utils';
import { nonNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';

const resolveProviderGroup = <
	P extends {
		key: SwapProvider;
		isEnabled: boolean;
		getSupportedTokens?: (...args: never[]) => Promise<Set<string>>;
		getSupportedDestinations: GetSupportedDestinationsFn;
	}
>({
	providers,
	sourceCategory,
	callFn
}: {
	providers: P[];
	sourceCategory: SwapTokenCategory;
	callFn: (getSupportedTokens: NonNullable<P['getSupportedTokens']>) => Promise<Set<string>>;
}): Promise<SwapProviderSupport[]> =>
	Promise.all(
		providers
			.filter(({ isEnabled }) => isEnabled)
			.map(async (provider) => {
				let supportedSourceTokens: Set<string> | undefined;
				if (nonNullish(provider.getSupportedTokens)) {
					try {
						supportedSourceTokens = await callFn(provider.getSupportedTokens);
					} catch (_err) {
						supportedSourceTokens = new Set();
					}
				}
				return {
					key: provider.key,
					sourceCategory,
					supportedSourceTokens,
					getSupportedDestinations: provider.getSupportedDestinations
				};
			})
	);

const aggregateCategory = (resolutions: SwapProviderSupport[]): SwapSupportedTokensInfo => {
	const totalEnabled = resolutions.length;
	const withList = resolutions.filter((r) => nonNullish(r.supportedSourceTokens)).length;
	const supportedTokenIds = resolutions.reduce<Set<string>>((acc, { supportedSourceTokens }) => {
		if (nonNullish(supportedSourceTokens)) {
			supportedSourceTokens.forEach((id) => acc.add(id));
		}
		return acc;
	}, new Set());

	return {
		coverage: determineCoverage({ totalEnabled, withList }),
		supportedTokenIds
	};
};

export const loadSwapSupportedTokens = async ({
	identity
}: {
	identity: Identity;
}): Promise<void> => {
	const [icpProviders, icpBridgeProvidersResolved, evmProviders, solProviders] = await Promise.all([
		resolveProviderGroup({
			providers: swapProviders,
			sourceCategory: 'icp',
			callFn: (fn) => fn({ identity })
		}),
		resolveProviderGroup({
			providers: icpBridgeProviders,
			sourceCategory: 'icp',
			callFn: (fn) => fn()
		}),
		resolveProviderGroup({
			providers: evmSwapProviders,
			sourceCategory: 'evm',
			callFn: (fn) => fn()
		}),
		resolveProviderGroup({
			providers: solSwapProviders,
			sourceCategory: 'sol',
			callFn: (fn) => fn()
		})
	]);

	const icpResolutions = [...icpProviders, ...icpBridgeProvidersResolved];

	const aggregated: SwapSupportedTokensData = {
		icp: aggregateCategory(icpResolutions),
		evm: aggregateCategory(evmProviders),
		sol: aggregateCategory(solProviders)
	};

	const providers: SwapProviderSupport[] = [...icpResolutions, ...evmProviders, ...solProviders];

	swapSupportedTokensStore.set({ aggregated, providers });
};
