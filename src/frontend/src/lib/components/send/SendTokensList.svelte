<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import TokenCardContent from '$lib/components/tokens/TokenCardContent.svelte';
	import TokenCardWithOnClick from '$lib/components/tokens/TokenCardWithOnClick.svelte';
	import TokensSkeletons from '$lib/components/tokens/TokensSkeletons.svelte';
	import { ZERO } from '$lib/constants/app.constants';
	import { combinedDerivedSortedNetworkTokensUi } from '$lib/derived/network-tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { TokenUi } from '$lib/types/token';

	const dispatch = createEventDispatcher();

	let tokens: TokenUi[];
	$: tokens = $combinedDerivedSortedNetworkTokensUi.filter(({ balance }) =>
		(balance ?? ZERO).gt(0n)
	);

	let loading: boolean;
	$: loading = $erc20UserTokensNotInitialized;
</script>

<div class="stretch">
	<TokensSkeletons {loading}>
		{#each tokens as token (token.id)}
			<TokenCardWithOnClick on:click={() => dispatch('icSendToken', token)}>
				<TokenCardContent {token} />
			</TokenCardWithOnClick>
		{/each}

		{#if tokens.length === 0}
			<p class="mt-4 mb-6 text-dark opacity-50">
				{$i18n.tokens.manage.text.all_tokens_zero_balance}
			</p>
		{/if}
	</TokensSkeletons>
</div>

<button class="secondary full center text-center mb-2" on:click={modalStore.close}>
	{$i18n.core.text.close}
</button>
