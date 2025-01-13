<script lang="ts">
	import { debounce, nonNullish } from '@dfinity/utils';
	import { combinedDerivedSortedNetworkTokensUi } from '$lib/derived/network-tokens.derived';
	import { showZeroBalances } from '$lib/derived/settings.derived';
	import type { TokenUi } from '$lib/types/token';
	import type { TokenUiGroup, TokenUiOrGroupUi } from '$lib/types/token-group';
	import { groupTokensByTwin } from '$lib/utils/token-group.utils';

	// We start it as undefined to avoid showing an empty list before the first update.
	export let tokens: TokenUiOrGroupUi[] | undefined = undefined;

	let groupedTokens: TokenUiOrGroupUi[];
	$: groupedTokens = groupTokensByTwin($combinedDerivedSortedNetworkTokensUi);

	let sortedTokensOrGroups: TokenUiOrGroupUi[];
	$: {
		const hasBalance = (token: TokenUi | TokenUiGroup) =>
			Number(token.balance ?? 0n) || token.usdBalance || $showZeroBalances;

		sortedTokensOrGroups = groupedTokens.filter((t: TokenUiGroup) =>
			nonNullish(t.tokens) ? t.tokens.some((tok: TokenUi) => hasBalance(tok)) : hasBalance(t)
		);
	}

	const updateTokensToDisplay = () => (tokens = [...sortedTokensOrGroups]);

	const debounceUpdateTokensToDisplay = debounce(updateTokensToDisplay, 500);

	$: sortedTokensOrGroups, debounceUpdateTokensToDisplay();
</script>

<slot />
