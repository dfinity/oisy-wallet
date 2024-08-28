import { combinedDerivedSortedNetworkTokensUi } from '$lib/derived/network-tokens.derived';
import { pointerEventStore } from '$lib/stores/events.store';
import type { TokenUi } from '$lib/types/token';
import { defineTokensToDisplay } from '$lib/utils/tokens-ui.utils';
import { derived, type Readable } from 'svelte/store';

export const combinedDerivedTokensUi: Readable<TokenUi[]> = derived(
	[combinedDerivedSortedNetworkTokensUi, pointerEventStore],
	([$sortedTokens, $pointerEventStore]) =>
		defineTokensToDisplay({ $sortedTokens, $pointerEventStore })
);
