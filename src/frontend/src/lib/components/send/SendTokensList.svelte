<script lang="ts">
	import TokensSkeletons from '$lib/components/tokens/TokensSkeletons.svelte';
	import { sortedNetworkTokensUi } from '$lib/derived/network-tokens.derived';
	import type { TokenUi } from '$lib/types/token';
	import { createEventDispatcher } from 'svelte';
	import TokenCardWithOnClick from '$lib/components/tokens/TokenCardWithOnClick.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import { i18n } from '$lib/stores/i18n.store';
	import TokenCardContent from '$lib/components/tokens/TokenCardContent.svelte';
	import { balancesStore } from '$lib/stores/balances.store';
	import { BigNumber } from '@ethersproject/bignumber';

	const dispatch = createEventDispatcher();

	let tokens: TokenUi[];
	$: tokens = $sortedNetworkTokensUi.filter(({ id: tokenId }) =>
		($balancesStore?.[tokenId]?.data ?? BigNumber.from(0n)).gt(0n)
	);
</script>

<TokensSkeletons>
	{#each tokens as token (token.id)}
		<TokenCardWithOnClick on:click={() => dispatch('icSendToken', token)}>
			<TokenCardContent {token} />
		</TokenCardWithOnClick>
	{/each}

	{#if tokens.length === 0}
		<p class="mt-4 mb-6 text-dark opacity-50">{$i18n.tokens.manage.text.all_tokens_zero_balance}</p>
	{/if}
</TokensSkeletons>

<button class="secondary full center text-center" on:click={modalStore.close}>
	{$i18n.core.text.close}
</button>
