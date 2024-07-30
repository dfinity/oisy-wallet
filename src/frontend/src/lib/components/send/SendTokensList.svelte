<script lang="ts">
	import { BigNumber } from '@ethersproject/bignumber';
	import TokensSkeletons from '$lib/components/tokens/TokensSkeletons.svelte';
	import { sortedNetworkTokensUiNonZeroBalance } from '$lib/derived/network-tokens.derived';
	import type { TokenUi } from '$lib/types/token';
	import { formatToken } from '$lib/utils/format.utils';
	import CardAmount from '$lib/components/ui/CardAmount.svelte';
	import ExchangeTokenValue from '$lib/components/exchange/ExchangeTokenValue.svelte';
	import { balancesStore } from '$lib/stores/balances.store';
	import { createEventDispatcher } from 'svelte';
	import TokenCardWithOnClick from '$lib/components/tokens/TokenCardWithOnClick.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import { i18n } from '$lib/stores/i18n.store';

	const dispatch = createEventDispatcher();

	let tokens: TokenUi[];
	$: tokens = $sortedNetworkTokensUiNonZeroBalance;
</script>

<TokensSkeletons>
	{#each tokens as token (token.id)}
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
	{/each}
</TokensSkeletons>

<button class="secondary full center text-center" on:click={modalStore.close}>
	{$i18n.core.text.close}
</button>
