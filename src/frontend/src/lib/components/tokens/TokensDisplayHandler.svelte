<script lang="ts">
	import { debounce } from '@dfinity/utils';
	import { combinedDerivedGroupedTokensUi } from '$lib/derived/network-tokens.derived';
	import type { TokenUiOrGroupUi } from '$lib/types/token';

	// We start it as undefined to avoid showing an empty list before the first update.
	export let tokens: TokenUiOrGroupUi[] | undefined = undefined;

	let sortedTokens: TokenUiOrGroupUi[];
	$: sortedTokens = $combinedDerivedGroupedTokensUi;

	const updateTokensToDisplay = () => (tokens = [...sortedTokens]);

	const debounceUpdateTokensToDisplay = debounce(updateTokensToDisplay, 500);

	$: sortedTokens, debounceUpdateTokensToDisplay();
</script>

<slot />
