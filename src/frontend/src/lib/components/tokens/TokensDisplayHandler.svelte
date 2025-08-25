<script lang="ts">
	import { debounce } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { combinedDerivedSortedFungibleNetworkTokensUi } from '$lib/derived/network-tokens.derived';
	import { showZeroBalances } from '$lib/derived/settings.derived';
	import type { TokenUiOrGroupUi } from '$lib/types/token-group';
	import { filterTokenGroups, groupTokensByTwin } from '$lib/utils/token-group.utils';

	interface Props {
		tokens: TokenUiOrGroupUi[] | undefined;
		children: Snippet;
	}

	// We start `tokens` as undefined to avoid showing an empty list before the first update.
	let { tokens = $bindable(), children }: Props = $props();

	let groupedTokens: TokenUiOrGroupUi[] = $derived(
		groupTokensByTwin($combinedDerivedSortedFungibleNetworkTokensUi)
	);

	let sortedTokensOrGroups: TokenUiOrGroupUi[] = $derived(
		filterTokenGroups({
			groupedTokens,
			showZeroBalances: $showZeroBalances
		})
	);

	const updateTokensToDisplay = () => (tokens = [...sortedTokensOrGroups]);

	const debounceUpdateTokensToDisplay = debounce(updateTokensToDisplay, 500);

	$effect(() => {
		[sortedTokensOrGroups];
		debounceUpdateTokensToDisplay();
	});
</script>

{@render children()}
