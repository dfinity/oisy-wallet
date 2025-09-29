<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { onDestroy, type Snippet } from 'svelte';
	import { combinedDerivedSortedFungibleNetworkTokensUi } from '$lib/derived/network-tokens.derived';
	import { showZeroBalances } from '$lib/derived/settings.derived';
	import type { TokenUiOrGroupUi } from '$lib/types/token-group';
	import { filterTokenGroups, groupTokensByTwin } from '$lib/utils/token-group.utils';

	interface Props {
		tokens: TokenUiOrGroupUi[] | undefined;
		animating: boolean;
		children: Snippet;
	}

	// We start `tokens` as undefined to avoid showing an empty list before the first update.
	let { tokens = $bindable(), animating, children }: Props = $props();

	let groupedTokens: TokenUiOrGroupUi[] = $derived(
		groupTokensByTwin($combinedDerivedSortedFungibleNetworkTokensUi)
	);

	let sortedTokensOrGroups: TokenUiOrGroupUi[] = $derived(
		filterTokenGroups({
			groupedTokens,
			showZeroBalances: $showZeroBalances
		})
	);

	let timer = $state<NodeJS.Timeout | undefined>();

	const clearTimer = () => {
		if (nonNullish(timer)) {
			clearTimeout(timer);
			timer = undefined;
		}
	};

	const apply = () => {
		tokens = [...sortedTokensOrGroups];
	};

	const updateTokensToDisplay = () => {
		if (!animating) {
			apply();

			return;
		}

		scheduleRetry();
	};

	const scheduleRetry = () => {
		timer = setTimeout(updateTokensToDisplay, 500);
	};

	$effect(() => {
		[sortedTokensOrGroups];

		updateTokensToDisplay();

		return clearTimer;
	});

	onDestroy(clearTimer);
</script>

{@render children()}
