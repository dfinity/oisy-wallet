<script lang="ts">
	import TokensSkeletons from '$lib/components/tokens/TokensSkeletons.svelte';
	import { sortedNetworkTokensUiNonZeroBalance } from '$lib/derived/network-tokens.derived';
	import type { TokenUi } from '$lib/types/token';
	import { createEventDispatcher } from 'svelte';
	import TokenCardWithOnClick from '$lib/components/tokens/TokenCardWithOnClick.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import { i18n } from '$lib/stores/i18n.store';
	import TokenCardContent from '$lib/components/tokens/TokenCardContent.svelte';

	const dispatch = createEventDispatcher();

	let tokens: TokenUi[];
	$: tokens = $sortedNetworkTokensUiNonZeroBalance;
</script>

<TokensSkeletons>
	{#each tokens as token (token.id)}
		<TokenCardWithOnClick on:click={() => dispatch('icSendToken', token)}>
			<TokenCardContent {token} />
		</TokenCardWithOnClick>
	{/each}
</TokensSkeletons>

<button class="secondary full center text-center" on:click={modalStore.close}>
	{$i18n.core.text.close}
</button>
