<script lang="ts">
	import Listener from '$lib/components/core/Listener.svelte';
	import TokensSkeletons from '$lib/components/tokens/TokensSkeletons.svelte';
	import { combinedDerivedSortedNetworkTokensUi } from '$lib/derived/network-tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token, TokenUi } from '$lib/types/token';
	import { hideZeroBalancesStore } from '$lib/stores/settings.store';
	import { fade } from 'svelte/transition';
	import { modalManageTokens } from '$lib/derived/modal.derived';
	import ManageTokensModal from '$icp-eth/components/tokens/ManageTokensModal.svelte';
	import TokenCardWithUrl from '$lib/components/tokens/TokenCardWithUrl.svelte';
	import TokenCardContent from '$lib/components/tokens/TokenCardContent.svelte';
	import { balancesStore } from '$lib/stores/balances.store';
	import { BigNumber } from '@ethersproject/bignumber';
	import { pointerEventStore } from '$lib/stores/events.store';
	import { pointerEventsHandler } from '$lib/utils/events.utils';
	import { debounce } from '@dfinity/utils';

	let displayZeroBalance: boolean;
	$: displayZeroBalance = $hideZeroBalancesStore?.enabled !== true;

	let tokens: TokenUi[];
	$: tokens = $combinedDerivedSortedNetworkTokensUi.filter(
		({ id: tokenId }) =>
			($balancesStore?.[tokenId]?.data ?? BigNumber.from(0n)).gt(0n) || displayZeroBalance
	);

	let tokensToDisplay: Token[] = [];

	const parseTokenKey = (token: Token) => `${token.id.description}-${token.network.id.description}`;

	let tokenKeys: string;
	$: tokenKeys = tokens.map(parseTokenKey).join(',');

	let tokensToDisplayKeys: string;
	$: tokensToDisplayKeys = tokensToDisplay.map(parseTokenKey).join(',');

	const defineTokensToDisplay = (): Token[] => {
		if (!$pointerEventStore) {
			// No pointer events, so we are not worried about possible glitches on user's interaction.
			return tokens;
		}

		// If there are pointer events, we need to avoid visually re-sorting the tokens, to prevent glitches on user's interaction.

		if (tokenKeys === tokensToDisplayKeys) {
			// The order is the same, so there will be no re-sorting and no possible glitches on user's interaction.
			// However, we need to update the tokensToDisplay to make sure the balances are up-to-date.
			return tokens;
		}

		// The order is not the same, so the list is the same as the one currently showed, but the balances are updated.
		const tokenMap = new Map(tokens.map((token) => [parseTokenKey(token), token]));

		return tokensToDisplay.map((token) => tokenMap.get(parseTokenKey(token)) ?? token);
	};

	const updateTokensToDisplay = () => (tokensToDisplay = defineTokensToDisplay());

	const debounceUpdateTokensToDisplay = debounce(updateTokensToDisplay, 500);

	$: $pointerEventStore, tokens, debounceUpdateTokensToDisplay();
</script>

<TokensSkeletons>
	<div use:pointerEventsHandler>
		{#each tokensToDisplay as token (token.id)}
			<Listener {token}>
				<div in:fade>
					<TokenCardWithUrl {token}>
						<TokenCardContent {token} />
					</TokenCardWithUrl>
				</div>
			</Listener>
		{/each}
	</div>

	{#if tokensToDisplay.length === 0}
		<p class="mt-4 text-dark opacity-50">{$i18n.tokens.text.all_tokens_with_zero_hidden}</p>
	{/if}

	{#if $modalManageTokens}
		<ManageTokensModal />
	{/if}
</TokensSkeletons>
