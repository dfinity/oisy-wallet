import { combinedDerivedSortedNetworkTokensUi } from '$lib/derived/network-tokens.derived';
import { sumTokensUiUsdBalance } from '$lib/utils/tokens.utils';
import { derived, type Readable } from 'svelte/store';

export const totalUsdBalance: Readable<number> = derived(
	[combinedDerivedSortedNetworkTokensUi],
	([$combinedDerivedSortedNetworkTokensUi]) =>
		sumTokensUiUsdBalance($combinedDerivedSortedNetworkTokensUi)
);

export const totalUsdBalanceZero: Readable<boolean> = derived(
	[totalUsdBalance],
	([$totalUsdBalance]) => $totalUsdBalance === 0
);

export const totalUsdBalanceNonZero: Readable<boolean> = derived(
	[totalUsdBalanceZero],
	([$totalUsdBalanceZero]) => !$totalUsdBalanceZero
);
