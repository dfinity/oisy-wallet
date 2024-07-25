<script lang="ts">
	import { BigNumber } from '@ethersproject/bignumber';
	import Listener from '$lib/components/core/Listener.svelte';
	import TokensSkeletons from '$lib/components/tokens/TokensSkeletons.svelte';
	import { enabledNetworkTokensUi } from '$lib/derived/network-tokens.derived';
	import type { TokenUi } from '$lib/types/token';
	import { fade } from 'svelte/transition';
	import { formatToken } from '$lib/utils/format.utils';
	import CardAmount from '$lib/components/ui/CardAmount.svelte';
	import ExchangeTokenValue from '$lib/components/exchange/ExchangeTokenValue.svelte';
	import { balancesStore } from '$lib/stores/balances.store';
	import { createEventDispatcher } from 'svelte';
	import TokenCardWithOnClick from '$lib/components/tokens/TokenCardWithOnClick.svelte';

	const dispatch = createEventDispatcher();

	let tokens: TokenUi[];
	$: tokens = $enabledNetworkTokensUi.filter(({ id: tokenId }) =>
		($balancesStore?.[tokenId]?.data ?? BigNumber.from(0n)).gt(0n)
	);
</script>

<TokensSkeletons>
	{#each tokens as token (token.id)}
		<Listener {token}>
			<div in:fade>
				<TokenCardWithOnClick {token} on:click={() => dispatch('icSendToken', token)}>
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
				</TokenCardWithOnClick>
			</div>
		</Listener>
	{/each}
</TokensSkeletons>
