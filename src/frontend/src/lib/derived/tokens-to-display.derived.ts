import { combinedDerivedSortedNetworkTokensUi } from '$lib/derived/network-tokens.derived';
import { pointerEventStore } from '$lib/stores/events.store';
import type { TokenUi } from '$lib/types/token';
import { defineTokensToDisplay } from '$lib/utils/tokens-to-display.utils';
import { derived, type Readable } from 'svelte/store';

export const combinedDerivedTokensToDisplay: Readable<TokenUi[]> = derived(
	[combinedDerivedSortedNetworkTokensUi, pointerEventStore],
	([$sortedTokens, $pointerEventStore]) =>
		defineTokensToDisplay({ $sortedTokens, $pointerEventStore })
);
