<script lang="ts">
	import { createEventDispatcher, getContext } from 'svelte';
	import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
	import TokenCardContent from '$lib/components/tokens/TokenCardContent.svelte';
	import TokenCardWithOnClick from '$lib/components/tokens/TokenCardWithOnClick.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import InputSearch from '$lib/components/ui/InputSearch.svelte';
	import { allIcrcTokens } from '$lib/derived/all-tokens.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { balancesStore } from '$lib/stores/balances.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { Token } from '$lib/types/token';
	import { mapTokenUi } from '$lib/utils/token.utils';
	import { filterTokens } from '$lib/utils/tokens.utils';

	const { sourceToken, destinationToken } = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const dispatch = createEventDispatcher();

	let filter = '';

	let noTokensMatch = false;
	$: noTokensMatch = filteredTokens.length === 0;

	let tokens: Token[];
	$: tokens = [ICP_TOKEN, ...$allIcrcTokens].filter(
		(token: Token) => token.id !== $sourceToken?.id && token.id !== $destinationToken?.id
	);

	let filteredTokens: Token[] = [];
	$: filteredTokens = filterTokens({ tokens, filter });
</script>

<InputSearch
	bind:filter
	noMatch={noTokensMatch}
	placeholder={$i18n.tokens.placeholder.search_token}
/>

<div class="my-6 flex flex-col overflow-y-hidden sm:max-h-[26rem]">
	<div class="tokens-scroll flex flex-col gap-6 overflow-y-auto overscroll-contain">
		{#each filteredTokens as token (token.id)}
			<TokenCardWithOnClick on:click={() => dispatch('icSelectToken', token)}>
				<TokenCardContent
					data={mapTokenUi({ token, $exchanges: $exchanges, $balances: $balancesStore })}
				/>
			</TokenCardWithOnClick>
		{/each}
	</div>
</div>

<ButtonGroup>
	<ButtonCancel on:click={() => dispatch('icCloseTokensList')} />
</ButtonGroup>
