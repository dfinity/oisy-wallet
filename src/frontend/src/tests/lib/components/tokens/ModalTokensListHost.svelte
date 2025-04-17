<script lang="ts">
	import type { Token } from '$lib/types/token';
	import { setContext } from 'svelte';
	import {
		initModalTokensListContext,
		MODAL_TOKENS_LIST_CONTEXT_KEY
	} from '$lib/stores/modal-tokens-list.store';
	import type { ModalTokensListContext } from '$lib/stores/modal-tokens-list.store';
	import ModalTokensList from '$lib/components/tokens/ModalTokensList.svelte';

	let { tokens, renderNoResults }: { tokens: Token[]; renderNoResults: boolean } = $props();

	setContext<ModalTokensListContext>(
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		initModalTokensListContext({
			tokens: tokens,
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
			<div data-tid={'custom-no-results'}>No results custom message</div>
		{/if}
	{/snippet}
	{#snippet tokenListItem(token: Token, onClick: () => void)}
		<button data-tid={'list-item-' + token.symbol} onclick={onClick}>{token.symbol}</button>
	{/snippet}
	{#snippet toolbar()}
		<div data-tid="toolbar">Toolbar</div>
	{/snippet}
</ModalTokensList>
