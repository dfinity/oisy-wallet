<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import Listener from '$lib/components/core/Listener.svelte';
	import TokenCardContent from '$lib/components/tokens/TokenCardContent.svelte';
	import TokenCardWithUrl from '$lib/components/tokens/TokenCardWithUrl.svelte';
	import TokensSkeletons from '$lib/components/tokens/TokensSkeletons.svelte';
	import { combinedDerivedSortedNetworkTokensUi } from '$lib/derived/network-tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { TokenUi } from '$lib/types/token';

	let tokens: TokenUi[] | undefined;
	$: tokens = $combinedDerivedSortedNetworkTokensUi;

	let loading: boolean;
	$: loading = $erc20UserTokensNotInitialized || isNullish(tokens);
</script>

<TokensSkeletons {loading}>
	<div class="flex flex-col">
		{#each tokens ?? [] as token (token.id)}
			<Listener {token}>
				<TokenCardWithUrl {token}>
					<TokenCardContent {token} />
				</TokenCardWithUrl>
			</Listener>
		{/each}
	</div>

	{#if tokens?.length === 0}
		<p class="text-secondary mt-4 opacity-50">{$i18n.tokens.text.all_tokens_with_zero_hidden}</p>
	{/if}
</TokensSkeletons>
