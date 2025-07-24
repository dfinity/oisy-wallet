<script lang="ts">
	import { debounce } from '@dfinity/utils';
	import { combinedDerivedSortedFungibleNetworkTokensUi } from '$lib/derived/network-tokens.derived';
	import { showZeroBalances } from '$lib/derived/settings.derived';
	import type { TokenUiOrGroupUi } from '$lib/types/token-group';
	import { filterTokenGroups, groupTokensByTwin } from '$lib/utils/token-group.utils';

	// We start it as undefined to avoid showing an empty list before the first update.
	export let tokens: TokenUiOrGroupUi[] | undefined = undefined;

	let groupedTokens: TokenUiOrGroupUi[];
	$: groupedTokens = groupTokensByTwin($combinedDerivedSortedFungibleNetworkTokensUi);

	let sortedTokensOrGroups: TokenUiOrGroupUi[];
	$: sortedTokensOrGroups = filterTokenGroups({
		groupedTokens,
		showZeroBalances: $showZeroBalances
	});

	const updateTokensToDisplay = () => (tokens = [...sortedTokensOrGroups]);

	const debounceUpdateTokensToDisplay = debounce(updateTokensToDisplay, 500);

	$: (sortedTokensOrGroups, debounceUpdateTokensToDisplay());
</script>

<slot />
