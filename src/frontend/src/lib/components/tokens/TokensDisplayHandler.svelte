<script lang="ts">
	import { debounce } from '@dfinity/utils';
	import { combinedDerivedSortedNetworkTokensUi } from '$lib/derived/network-tokens.derived';
	import { showZeroBalances } from '$lib/derived/settings.derived';
	import type { Token, TokenUi } from '$lib/types/token';

	// We start it as undefined to avoid showing an empty list before the first update.
	export let tokens: Token[] | undefined = undefined;

	let sortedTokens: TokenUi[];
	$: sortedTokens = $combinedDerivedSortedNetworkTokensUi.filter(
		({ balance, usdBalance }) => Number(balance ?? 0n) || (usdBalance ?? 0) || $showZeroBalances
	);

	const updateTokensToDisplay = () => (tokens = [...sortedTokens]);

	const debounceUpdateTokensToDisplay = debounce(updateTokensToDisplay, 500);

	$: sortedTokens, debounceUpdateTokensToDisplay();
</script>

<slot />
