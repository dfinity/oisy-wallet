<script lang="ts">
	import { debounce } from '@dfinity/utils';
	import { combinedDerivedFilteredNetworkTokensUi } from '$lib/derived/network-tokens.derived';
	import type { TokenUi } from '$lib/types/token';

	// We start it as undefined to avoid showing an empty list before the first update.
	export let tokens: TokenUi[] | undefined = undefined;

	let sortedTokens: TokenUi[];
	$: sortedTokens = $combinedDerivedFilteredNetworkTokensUi;

	const updateTokensToDisplay = () => (tokens = [...sortedTokens]);

	const debounceUpdateTokensToDisplay = debounce(updateTokensToDisplay, 500);

	$: sortedTokens, debounceUpdateTokensToDisplay();
</script>

<slot />
