<script lang="ts">
	import Listener from '$lib/components/core/Listener.svelte';
	import TokensSkeletons from '$lib/components/tokens/TokensSkeletons.svelte';
	import { sortedNetworkTokensUi } from '$lib/derived/network-tokens.derived';
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

	let displayZeroBalance: boolean;
	$: displayZeroBalance = $hideZeroBalancesStore?.enabled !== true;

	let tokens: TokenUi[];
	$: tokens = $sortedNetworkTokensUi.filter(
		({ id: tokenId }) =>
			($balancesStore?.[tokenId]?.data ?? BigNumber.from(0n)).gt(0n) || displayZeroBalance
	);

	let sortingEnabled = true;

	const enableSortingTokens = () => (sortingEnabled = true);

	const disableSortingTokens = () => (sortingEnabled = false);

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

	const passiveEvent = (
		node: HTMLElement,
		{ event, handler }: { event: string; handler: EventListener }
	) => {
		node.addEventListener(event, handler, { passive: true });

		return {
			destroy() {
				node.removeEventListener(event, handler);
			}
		};
	};
</script>

<TokensSkeletons>
	<div
		use:passiveEvent={{ event: 'pointerenter', handler: disableSortingTokens }}
		use:passiveEvent={{ event: 'pointerover', handler: disableSortingTokens }}
		use:passiveEvent={{ event: 'pointerleave', handler: enableSortingTokens }}
		use:passiveEvent={{ event: 'focus', handler: disableSortingTokens }}
		use:passiveEvent={{ event: 'focusin', handler: disableSortingTokens }}
		use:passiveEvent={{ event: 'focusout', handler: enableSortingTokens }}
		use:passiveEvent={{ event: 'touchstart', handler: disableSortingTokens }}
		use:passiveEvent={{ event: 'touchmove', handler: disableSortingTokens }}
		use:passiveEvent={{ event: 'touchend', handler: enableSortingTokens }}
	>
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
