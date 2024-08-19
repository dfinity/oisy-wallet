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

	let displayZeroBalance: boolean;
	$: displayZeroBalance = $hideZeroBalancesStore?.enabled !== true;

	let tokens: TokenUi[];
	$: tokens = $combinedDerivedSortedNetworkTokensUi.filter(
		({ id: tokenId }) =>
			($balancesStore?.[tokenId]?.data ?? BigNumber.from(0n)).gt(0n) || displayZeroBalance
	);

	let sortingEnabled = true;
	$: $pointerEventStore, (sortingEnabled = !$pointerEventStore);

	const updateTokensToDisplay = ({
		tokensToDisplay,
		newTokensList
	}: {
		tokensToDisplay: Token[];
		newTokensList: Token[];
	}): Token[] => {
		if (sortingEnabled) {
			return newTokensList;
		}

		const tokenMap = new Map(
			newTokensList.map((token) => [
				`${token.id.description}-${token.network.id.description}`,
				token
			])
		);
		return tokensToDisplay.map(
			(token) => tokenMap.get(`${token.id.description}-${token.network.id.description}`) ?? token
		);
	};

	let tokensToDisplay: Token[] = [];
	$: tokensToDisplay = updateTokensToDisplay({ tokensToDisplay, newTokensList: tokens });
</script>

<TokensSkeletons>
	{#each tokensToDisplay as token (token.id)}
		<Listener {token}>
			<div in:fade>
				<TokenCardWithUrl {token}>
					<TokenCardContent {token} />
				</TokenCardWithUrl>
			</div>
		</Listener>
	{/each}

	{#if tokensToDisplay.length === 0}
		<p class="mt-4 text-dark opacity-50">{$i18n.tokens.text.all_tokens_with_zero_hidden}</p>
	{/if}

	{#if $modalManageTokens}
		<ManageTokensModal />
	{/if}
</TokensSkeletons>
