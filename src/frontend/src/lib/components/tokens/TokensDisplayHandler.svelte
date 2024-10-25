<script lang="ts">
	import { debounce } from '@dfinity/utils';
	import { combinedDerivedSortedNetworkTokensUi } from '$lib/derived/network-tokens.derived';
	import { showZeroBalances } from '$lib/derived/settings.derived';
	import type { TokenUi, TokenUiOrGroupUi } from '$lib/types/token';
	import { groupTokensByTwin } from '$lib/utils/token.utils';

	// We start it as undefined to avoid showing an empty list before the first update.
	export let tokens: TokenUiOrGroupUi[] | undefined = undefined;

	let sortedTokens: TokenUi[];
	$: sortedTokens = $combinedDerivedSortedNetworkTokensUi.filter(
		({ balance, usdBalance }) => Number(balance ?? 0n) || (usdBalance ?? 0) || $showZeroBalances
	);

	let groupedTokens: TokenUiOrGroupUi[];
	$: groupedTokens = groupTokensByTwin(sortedTokens);

	const updateTokensToDisplay = () => (tokens = [...groupedTokens]);

	const debounceUpdateTokensToDisplay = debounce(updateTokensToDisplay, 500);

	$: sortedTokens, debounceUpdateTokensToDisplay();
</script>

<slot />
