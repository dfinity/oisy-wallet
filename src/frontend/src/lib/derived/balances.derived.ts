import { anyLendBorrowProviderEnabled } from '$env/lend-borrow';
import { anyTradingProviderEnabled } from '$env/trading';
import { ZERO } from '$lib/constants/app.constants';
import { liquidiumNetValueUsd } from '$lib/derived/liquidium.derived';
import { enabledFungibleNetworkTokens } from '$lib/derived/network-tokens.derived';
import { oisyTradeUsdValue } from '$lib/derived/oisy-trade.derived';
import { enabledMainnetFungibleTokensUi } from '$lib/derived/tokens-ui.derived';
import { balancesStore } from '$lib/stores/balances.store';
import { token } from '$lib/stores/token.store';
import type { OptionBalance } from '$lib/types/balance';
import { checkAllBalancesZero, checkAnyNonZeroBalance } from '$lib/utils/balances.utils';
import { sumTotalUsdBalance } from '$lib/utils/tokens.utils';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const balance: Readable<OptionBalance> = derived(
	[balancesStore, token],
	([$balanceStore, $token]) => (nonNullish($token) ? $balanceStore?.[$token.id]?.data : undefined)
);

export const balanceZero: Readable<boolean> = derived(
	[balancesStore, token],
	([$balanceStore, $token]) =>
		nonNullish($balanceStore) &&
		nonNullish($token) &&
		nonNullish($balanceStore?.[$token.id]) &&
		$balanceStore[$token.id]?.data === ZERO
);

export const anyBalanceNonZero: Readable<boolean> = derived([balancesStore], ([$balanceStore]) =>
	checkAnyNonZeroBalance($balanceStore)
);

export const allBalancesZero: Readable<boolean> = derived(
	[balancesStore, enabledFungibleNetworkTokens],
	([$balancesStore, $enabledNetworkTokens]) =>
		checkAllBalancesZero({
			$balancesStore,
			minLength: $enabledNetworkTokens.length
		})
);

export const noPositiveBalanceAndNotAllBalancesZero: Readable<boolean> = derived(
	[anyBalanceNonZero, allBalancesZero],
	([$anyBalanceNonZero, $allBalancesZero]) => !$anyBalanceNonZero && !$allBalancesZero
);

/**
 * Value the user holds with a provider rather than in a wallet token: DEX deposits (free +
 * reserved) and the lend/borrow net value, each gated behind its provider flag.
 *
 * Portfolio-wide, so it does not narrow with a token or network filter.
 */
export const providersUsdBalance: Readable<number> = derived(
	[oisyTradeUsdValue, liquidiumNetValueUsd],
	([$oisyTradeUsdValue, $liquidiumNetValueUsd]) =>
		(anyTradingProviderEnabled ? $oisyTradeUsdValue : 0) +
		(anyLendBorrowProviderEnabled ? $liquidiumNetValueUsd : 0)
);

/**
 * Net worth over every enabled mainnet fungible token — the whole-wallet total, independent of
 * the selected network and of any UI filter.
 */
export const enabledMainnetTotalUsdBalance: Readable<number> = derived(
	[enabledMainnetFungibleTokensUi, providersUsdBalance],
	([$enabledMainnetFungibleTokensUi, $providersUsdBalance]) =>
		sumTotalUsdBalance({
			tokens: $enabledMainnetFungibleTokensUi,
			providersUsdBalance: $providersUsdBalance
		})
);
