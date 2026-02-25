<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { type Snippet, untrack } from 'svelte';
	import { sortedFungibleNetworkTokensUiOrGroupUi } from '$lib/derived/network-tokens-ui.derived';
	import { sortedEnabledNetworkTokenUiOrGroupUi } from '$lib/derived/network-tokens-ui.derived';
	import { showZeroBalances } from '$lib/derived/settings.derived';
	import type { TokenUiOrGroupUi } from '$lib/types/token-ui-group';
	import { filterTokenGroups } from '$lib/utils/token-group.utils';

	interface Props {
		tokens?: TokenUiOrGroupUi[];
		children: Snippet;
	}

	// We start `tokens` as undefined to avoid showing an empty list before the first update.
	let { tokens = $bindable(), children }: Props = $props();

	let sortedTokensOrGroups: TokenUiOrGroupUi[] = $derived(
		filterTokenGroups({
			groupedTokens: $sortedEnabledNetworkTokenUiOrGroupUi,
			showZeroBalances: $showZeroBalances
		})
	);

	let rafId: number | null = null;

	const clearUpRaf = () => {
		// coalesce to 1 update per frame
		if (nonNullish(rafId)) {
			cancelAnimationFrame(rafId);
		}
	};

	const updateTokensToDisplay = () => {
		clearUpRaf();

		rafId = requestAnimationFrame(() => {
			rafId = null;

			tokens = sortedTokensOrGroups;
		});

		return () => {
			clearUpRaf();
		};
	};

	$effect(() => {
		[sortedTokensOrGroups];

		untrack(() => updateTokensToDisplay());
	});
</script>

{@render children()}
