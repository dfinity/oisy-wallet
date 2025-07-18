<script lang="ts">
	import { setContext } from 'svelte';
	import ModalTokensList from '$lib/components/tokens/ModalTokensList.svelte';
	import {
		initModalTokensListContext,
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';
	import type { Token } from '$lib/types/token';
	import {
		MODAL_TOKEN_LIST_CUSTOM_NO_RESULTS,
		MODAL_TOKEN_LIST_ITEM_PREFIX,
		MODAL_TOKEN_LIST_TOOLBAR
	} from '$tests/lib/components/tokens/ModalTokensList.spec';

	let { tokens, renderNoResults }: { tokens: Token[]; renderNoResults: boolean } = $props();

	setContext<ModalTokensListContext>(
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		initModalTokensListContext({
			tokens,
			filterZeroBalance: false,
			filterNetwork: undefined,
			filterQuery: ''
		})
	);
</script>

<ModalTokensList
	loading={false}
	networkSelectorViewOnly={false}
	on:icTokenButtonClick
	on:icSelectNetworkFilter
>
	{#snippet noResults()}
		{#if renderNoResults}
			<div data-tid={MODAL_TOKEN_LIST_CUSTOM_NO_RESULTS}>No results custom message</div>
		{/if}
	{/snippet}
	{#snippet tokenListItem(token: Token, onClick: () => void)}
		<button data-tid={`${MODAL_TOKEN_LIST_ITEM_PREFIX}${token.symbol}`} onclick={onClick}
			>{token.symbol}</button
		>
	{/snippet}
	{#snippet toolbar()}
		<div data-tid={MODAL_TOKEN_LIST_TOOLBAR}>Toolbar</div>
	{/snippet}
</ModalTokensList>
