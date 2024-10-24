<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import TokenCardContent from '$lib/components/tokens/TokenCardContent.svelte';
	import TokenCardWithOnClick from '$lib/components/tokens/TokenCardWithOnClick.svelte';
	import TokensSkeletons from '$lib/components/tokens/TokensSkeletons.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
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

<ContentWithToolbar>
	<TokensSkeletons {loading}>
		<div class="mb-6 flex flex-col gap-6">
			{#each tokens as token (token.id)}
				<TokenCardWithOnClick on:click={() => dispatch('icSendToken', token)}>
					<TokenCardContent data={token} />
				</TokenCardWithOnClick>
			{/each}
		</div>

		{#if tokens.length === 0}
			<p class="text-secondary mb-6 mt-4 opacity-50">
				{$i18n.tokens.manage.text.all_tokens_zero_balance}
			</p>
		{/if}
	</TokensSkeletons>

	<Button
		colorStyle="secondary"
		fullWidth
		styleClass="mb-2"
		on:click={modalStore.close}
		slot="toolbar"
	>
		{$i18n.core.text.close}
	</Button>
</ContentWithToolbar>
