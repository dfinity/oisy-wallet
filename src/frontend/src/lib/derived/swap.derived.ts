import { enabledMainnetBitcoinToken } from '$btc/derived/tokens.derived';
import { CHAIN_FUSION_SWAP_ENABLED } from '$env/chain-fusion-swap.env';
import { NEAR_INTENTS_BTC_SWAP_ENABLED } from '$env/rest/near-intents.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { ZERO } from '$lib/constants/app.constants';
import {
	allCrossChainSwapTokens,
	allSortedIcrcTokens,
	allSwapCompatibleIcrcTokens
} from '$lib/derived/all-tokens.derived';
import { pageToken } from '$lib/derived/page-token.derived';
import { balancesStore } from '$lib/stores/balances.store';
import { swapSupportedTokensStore } from '$lib/stores/swap-supported-tokens.store';
import type { Balance } from '$lib/types/balance';
import type { Token } from '$lib/types/token';
import type { TokenToggleable } from '$lib/types/token-toggleable';
import { filterSwapTokens } from '$lib/utils/swap-tokens-filter.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export interface SwappableTokens {
	sourceToken: Token | undefined;
	destinationToken: Token | undefined;
}

/**
 * Bitcoin's contribution to the swap universe: the enabled mainnet BTC token, and only
 * when a provider can move it: Chain Fusion (ck conversion) or NEAR Intents (bridging).
 *
 * Kept out of `allCrossChainSwapTokens`, which is typed around the EVM / SOL custom-token
 * unions that BTC does not belong to.
 */
const swapUniverseBitcoinTokens: Readable<TokenToggleable<Token>[]> = derived(
	[enabledMainnetBitcoinToken],
	([$enabledMainnetBitcoinToken]) =>
		(CHAIN_FUSION_SWAP_ENABLED || NEAR_INTENTS_BTC_SWAP_ENABLED) &&
		nonNullish($enabledMainnetBitcoinToken)
			? [{ ...$enabledMainnetBitcoinToken, enabled: true }]
			: []
);

/**
 * The unfiltered universe of tokens that can appear in either side of the swap UI:
 * ICP + all known ICRC tokens + all cross-chain (EVM/SOL) tokens + Bitcoin.
 * Provider-supported filtering is applied on top via `filterSwapTokens`.
 */
export const allSwapUniverseTokens: Readable<TokenToggleable<Token>[]> = derived(
	[allSortedIcrcTokens, allCrossChainSwapTokens, swapUniverseBitcoinTokens],
	([$allSortedIcrcTokens, $allCrossChainSwapTokens, $swapUniverseBitcoinTokens]) => [
		{ ...ICP_TOKEN, enabled: true },
		...$allSortedIcrcTokens,
		...$allCrossChainSwapTokens,
		...$swapUniverseBitcoinTokens
	]
);

const selectedSwappableToken: Readable<Token | undefined> = derived(
	[pageToken, allSwapCompatibleIcrcTokens, allCrossChainSwapTokens, swapUniverseBitcoinTokens],
	([
		$pageToken,
		$allSwapCompatibleIcrcTokens,
		$allCrossChainSwapTokens,
		$swapUniverseBitcoinTokens
	]) => {
		if (nonNullish($pageToken)) {
			const selectedToken = $pageToken;

			const swappableToken: Token | undefined = [
				{ ...ICP_TOKEN, enabled: true },
				...$allSwapCompatibleIcrcTokens,
				...$allCrossChainSwapTokens,
				// Without this, opening Swap from the BTC token page would fail to preselect BTC.
				...$swapUniverseBitcoinTokens
			].find((t) => t.id === selectedToken.id);

			if (nonNullish(swappableToken)) {
				return {
					...selectedToken,
					...swappableToken
				};
			}
		}

		return undefined;
	}
);

export const isPageTokenSwappable: Readable<boolean> = derived(
	[selectedSwappableToken, swapSupportedTokensStore],
	([$selectedSwappableToken, $swapSupportedTokensStore]) => {
		if (isNullish($selectedSwappableToken)) {
			return false;
		}

		const result = filterSwapTokens({
			tokens: [{ ...$selectedSwappableToken, enabled: true }],
			supportedData: $swapSupportedTokensStore?.aggregated
		});

		return result.length > 0;
	}
);

export const swappableTokens: Readable<SwappableTokens> = derived(
	[balancesStore, selectedSwappableToken],
	([$balancesStore, $selectedSwappableToken]) => {
		const selectedToken = $selectedSwappableToken;
		if (isNullish(selectedToken)) {
			return { sourceToken: undefined, destinationToken: undefined };
		}

		const balance: Balance | undefined = $balancesStore?.[selectedToken.id]?.data;
		if (isNullish(balance)) {
			return { sourceToken: undefined, destinationToken: undefined };
		}

		if (balance > ZERO) {
			return { sourceToken: selectedToken, destinationToken: undefined };
		}
		return { sourceToken: undefined, destinationToken: selectedToken };
	}
);
