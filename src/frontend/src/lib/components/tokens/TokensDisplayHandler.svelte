<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { onDestroy, type Snippet, untrack } from 'svelte';
	import { combinedDerivedSortedFungibleNetworkTokensUi } from '$lib/derived/network-tokens.derived';
	import { showZeroBalances } from '$lib/derived/settings.derived';
	import type { TokenUiOrGroupUi } from '$lib/types/token-ui-group';
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

	let timer = $state<NodeJS.Timeout | undefined>();

	let updating = false

	const clearTimer = () => {
		if (nonNullish(timer)) {
			clearTimeout(timer);
			timer = undefined;
		}
	};

	const apply = () => {
		updating = true;
		tokens = [...sortedTokensOrGroups];
		updating = false;
	};

	const updateTokensToDisplay = () => {
		if (!updating) {
			apply();

			clearTimer();

			return;
		}

		scheduleRetry();
	};

	const scheduleRetry = () => {
		if (nonNullish(timer)) {
			return;
		}

		timer = setTimeout(updateTokensToDisplay, 500);
	};

	$effect(() => {
		[sortedTokensOrGroups];

		untrack(() => updateTokensToDisplay());
	});

	onDestroy(clearTimer);
</script>

{@render children()}
