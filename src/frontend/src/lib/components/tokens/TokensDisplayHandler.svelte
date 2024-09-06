<script lang="ts">
	import type { Token, TokenUi } from '$lib/types/token';
	import { pointerEventStore } from '$lib/stores/events.store';
	import { pointerEventsHandler } from '$lib/utils/events.utils';
	import { debounce } from '@dfinity/utils';
	import { hideZeroBalancesStore } from '$lib/stores/settings.store';
	import { combinedDerivedSortedNetworkTokensUi } from '$lib/derived/network-tokens.derived';
	import { defineTokensToDisplay } from '$lib/utils/tokens-ui.utils';

	// We start it as undefined to avoid showing an empty list before the first update.
	export let tokens: Token[] | undefined = undefined;

	let displayZeroBalance: boolean;
	$: displayZeroBalance = $hideZeroBalancesStore?.enabled !== true;

	let sortedTokens: TokenUi[];
	$: sortedTokens = $combinedDerivedSortedNetworkTokensUi.filter(
		({ balance, usdBalance }) => Number(balance ?? 0n) || (usdBalance ?? 0) || displayZeroBalance
	);

	const updateTokensToDisplay = () =>
		(tokens = defineTokensToDisplay({
			currentTokens: tokens,
			sortedTokens,
			$pointerEventStore: $pointerEventStore
		}));

	const debounceUpdateTokensToDisplay = debounce(updateTokensToDisplay, 500);

	$: $pointerEventStore, sortedTokens, debounceUpdateTokensToDisplay();
</script>

<div use:pointerEventsHandler>
	<slot />
</div>
