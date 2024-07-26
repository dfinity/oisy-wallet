<script lang="ts">
	import { BigNumber } from '@ethersproject/bignumber';
	import Listener from '$lib/components/core/Listener.svelte';
	import TokensSkeletons from '$lib/components/tokens/TokensSkeletons.svelte';
	import { enabledNetworkTokensUi } from '$lib/derived/network-tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token, TokenUi } from '$lib/types/token';
	import { hideZeroBalancesStore } from '$lib/stores/settings.store';
	import { fade } from 'svelte/transition';
	import { modalManageTokens } from '$lib/derived/modal.derived';
	import ManageTokensModal from '$icp-eth/components/tokens/ManageTokensModal.svelte';
	import TokenCard from '$lib/components/tokens/TokenCard.svelte';
	import { formatToken } from '$lib/utils/format.utils';
	import CardAmount from '$lib/components/ui/CardAmount.svelte';
	import ExchangeTokenValue from '$lib/components/exchange/ExchangeTokenValue.svelte';
	import TokenReceiveSend from '$lib/components/tokens/TokenReceiveSend.svelte';
	import { balancesStore } from '$lib/stores/balances.store';

	let displayZeroBalance: boolean;
	$: displayZeroBalance = $hideZeroBalancesStore?.enabled !== true;

	let tokens: TokenUi[];
	$: tokens = $enabledNetworkTokensUi.filter(
		({ id: tokenId }) =>
			($balancesStore?.[tokenId]?.data ?? BigNumber.from(0n)).gt(0n) || displayZeroBalance
	);

	let stopRefreshing = false;

	const stopRefreshingTokens = () => {
		stopRefreshing = true;
	};

	const startRefreshingTokens = () => {
		stopRefreshing = false;
	};

	let tokensToDisplay: Token[] = [];
	$: tokensToDisplay = stopRefreshing ? updateTokensStatic(tokensToDisplay, tokens) : tokens;

	const updateTokensStatic = (staticTokens: Token[], dynamicTokens: Token[]): Token[] => {
		const tokenMap = new Map(
			dynamicTokens.map((token) => [
				`${token.id.description}-${token.network.id.description}`,
				token
			])
		);
		return staticTokens.map(
			(token) => tokenMap.get(`${token.id.description}-${token.network.id.description}`) ?? token
		);
	};

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
		use:passiveEvent={{ event: 'pointerenter', handler: stopRefreshingTokens }}
		use:passiveEvent={{ event: 'pointerover', handler: stopRefreshingTokens }}
		use:passiveEvent={{ event: 'pointerleave', handler: startRefreshingTokens }}
		use:passiveEvent={{ event: 'focus', handler: stopRefreshingTokens }}
		use:passiveEvent={{ event: 'focusin', handler: stopRefreshingTokens }}
		use:passiveEvent={{ event: 'focusout', handler: startRefreshingTokens }}
		use:passiveEvent={{ event: 'touchstart', handler: stopRefreshingTokens }}
		use:passiveEvent={{ event: 'touchmove', handler: stopRefreshingTokens }}
		use:passiveEvent={{ event: 'touchend', handler: startRefreshingTokens }}
	>
		{#each tokensToDisplay as token (token.id)}
			<Listener {token}>
				<div in:fade>
					<TokenCard {token}>
						<output class="break-all" slot="description">
							{formatToken({
								value: $balancesStore?.[token.id]?.data ?? BigNumber.from(0n),
								unitName: token.decimals
							})}
							{token.symbol}
						</output>

						<CardAmount slot="exchange">
							<ExchangeTokenValue {token} />
						</CardAmount>

						<TokenReceiveSend {token} slot="actions" />
					</TokenCard>
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
