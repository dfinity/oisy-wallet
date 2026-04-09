import { evmSwapProviders } from '$lib/providers/evm-swap.providers';
import { solSwapProviders } from '$lib/providers/sol-swap.providers';
import { swapProviders } from '$lib/providers/swap.providers';
import {
	swapSupportedTokensStore,
	type SwapProviderListCoverage,
	type SwapSupportedTokensInfo
} from '$lib/stores/swap-supported-tokens.store';
import { nonNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';

const determineCoverage = ({
	totalEnabled,
	withList
}: {
	totalEnabled: number;
	withList: number;
}): SwapProviderListCoverage => {
	if (totalEnabled === 0 || withList === 0) {
		return 'none';
	}

	return withList >= totalEnabled ? 'all' : 'some';
};

/**
 * Filters providers that have `getSupportedTokens` and calls it in a single pass,
 * collecting the resulting promises without non-null assertions.
 */
const buildFetchTokenSets = <
	P extends { getSupportedTokens?: (...args: never[]) => Promise<Set<string>> }
>({
	providers,
	callFn
}: {
	providers: P[];
	callFn: (getSupportedTokens: NonNullable<P['getSupportedTokens']>) => Promise<Set<string>>;
}): Promise<Set<string>>[] =>
	providers.reduce<Promise<Set<string>>[]>((acc, provider) => {
		if (nonNullish(provider.getSupportedTokens)) {
			acc.push(callFn(provider.getSupportedTokens));
		}

		return acc;
	}, []);

const collectSupportedTokens = async ({
	totalEnabled,
	fetchTokenSets
}: {
	totalEnabled: number;
	fetchTokenSets: Promise<Set<string>>[];
}): Promise<SwapSupportedTokensInfo> => {
	const coverage = determineCoverage({
		totalEnabled,
		withList: fetchTokenSets.length
	});

	if (coverage === 'none') {
		return { coverage, supportedTokenIds: new Set() };
	}

	const results = await Promise.allSettled(fetchTokenSets);

	const supportedTokenIds = results.reduce<Set<string>>((acc, result) => {
		if (result.status === 'fulfilled') {
			for (const id of result.value) {
				acc.add(id);
			}
		}

		return acc;
	}, new Set());

	return { coverage, supportedTokenIds };
};

export const loadSwapSupportedTokens = async ({
	identity
}: {
	identity: Identity;
}): Promise<void> => {
	const enabledIcpProviders = swapProviders.filter(({ isEnabled }) => isEnabled);
	const enabledEvmProviders = evmSwapProviders.filter(({ isEnabled }) => isEnabled);
	const enabledSolProviders = solSwapProviders.filter(({ isEnabled }) => isEnabled);

	const [icp, evm, sol] = await Promise.all([
		collectSupportedTokens({
			totalEnabled: enabledIcpProviders.length,
			fetchTokenSets: buildFetchTokenSets({
				providers: enabledIcpProviders,
				callFn: (fn) => fn({ identity })
			})
		}),
		collectSupportedTokens({
			totalEnabled: enabledEvmProviders.length,
			fetchTokenSets: buildFetchTokenSets({
				providers: enabledEvmProviders,
				callFn: (fn) => fn()
			})
		}),
		collectSupportedTokens({
			totalEnabled: enabledSolProviders.length,
			fetchTokenSets: buildFetchTokenSets({
				providers: enabledSolProviders,
				callFn: (fn) => fn()
			})
		})
	]);

	swapSupportedTokensStore.set({ icp, evm, sol });
};
