<script lang="ts">
	import { debounce } from '@dfinity/utils';
	import { combinedDerivedSortedNetworkTokensUi } from '$lib/derived/network-tokens.derived';
	import { showZeroBalances } from '$lib/derived/settings.derived';
	import type { TokenUiOrGroupUi } from '$lib/types/token';
	import { groupTokensByTwin } from '$lib/utils/token.utils.js';

	// We start it as undefined to avoid showing an empty list before the first update.
	export let tokens: TokenUiOrGroupUi[] | undefined = undefined;

	let sortedTokens: TokenUiOrGroupUi[];
	$: sortedTokens = groupTokensByTwin(
		$combinedDerivedSortedNetworkTokensUi.filter(
			({ balance, usdBalance }) => Number(balance ?? 0n) || (usdBalance ?? 0) || $showZeroBalances
		)
	);

	const updateTokensToDisplay = () => (tokens = [...sortedTokens]);

	const debounceUpdateTokensToDisplay = debounce(updateTokensToDisplay, 1000);

	$: sortedTokens, debounceUpdateTokensToDisplay();
</script>

<slot />
