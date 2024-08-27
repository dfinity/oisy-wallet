<script lang="ts">
	import type { Token, TokenUi } from '$lib/types/token';
	import { pointerEventStore } from '$lib/stores/events.store';
	import { pointerEventsHandler } from '$lib/utils/events.utils';
	import { debounce } from '@dfinity/utils';
	import { hideZeroBalancesStore } from '$lib/stores/settings.store';
	import { combinedDerivedSortedNetworkTokensUi } from '$lib/derived/network-tokens.derived';
	import { balancesStore } from '$lib/stores/balances.store';
	import { BigNumber } from '@ethersproject/bignumber';

	// We start it as undefined to avoid showing an empty list before the first update.
	export let tokens: Token[] | undefined = undefined;

	let displayZeroBalance: boolean;
	$: displayZeroBalance = $hideZeroBalancesStore?.enabled !== true;

	let sortedTokens: TokenUi[];
	$: sortedTokens = $combinedDerivedSortedNetworkTokensUi.filter(
		({ id: tokenId }) =>
			($balancesStore?.[tokenId]?.data ?? BigNumber.from(0n)).gt(0n) || displayZeroBalance
	);

	const parseTokenKey = (token: Token) => `${token.id.description}-${token.network.id.description}`;

	let tokenKeys: string;
	$: tokenKeys = tokens?.map(parseTokenKey).join(',') ?? '';

	let sortedTokensKeys: string;
	$: sortedTokensKeys = sortedTokens?.map(parseTokenKey).join(',') ?? '';

	const updateTokensToDisplay = () => {
		if (!$pointerEventStore) {
			// No pointer events, so we are not worried about possible glitches on user's interaction.
			tokens = sortedTokens;
			return;
		}

		// If there are pointer events, we need to avoid visually re-sorting the tokens, to prevent glitches on user's interaction.

		if (tokenKeys === sortedTokensKeys) {
			// The order is the same, so there will be no re-sorting and no possible glitches on user's interaction.
			// However, we need to update the tokensToDisplay to make sure the balances are up-to-date.
			tokens = sortedTokens;
			return;
		}

		// The order is not the same, so the list is kept the same as the one currently showed, but the balances are updated.
		const tokenMap = new Map(sortedTokens.map((token) => [parseTokenKey(token), token]));

		tokens = tokens?.map((token) => tokenMap.get(parseTokenKey(token)) ?? token) ?? [];
	};

	const debounceUpdateTokensToDisplay = debounce(updateTokensToDisplay, 500);

	$: $pointerEventStore, sortedTokens, debounceUpdateTokensToDisplay();
</script>

<div use:pointerEventsHandler>
	<slot />
</div>
