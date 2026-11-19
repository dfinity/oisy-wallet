<script lang="ts">
	import { setContext } from 'svelte';
	import ModalTokensList from '$lib/components/tokens/ModalTokensList.svelte';
	import type { TokenCategoryTagValue } from '$lib/enums/token-tag';
	import {
		initModalTokensListContext,
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';
	import type { Network } from '$lib/types/network';
	import type { Token } from '$lib/types/token';
	import {
		MODAL_TOKEN_LIST_CUSTOM_NO_RESULTS,
		MODAL_TOKEN_LIST_ITEM_PREFIX,
		MODAL_TOKEN_LIST_TOOLBAR
	} from '$tests/lib/components/tokens/ModalTokensList.spec';

	interface Props {
		tokens: Token[];
		renderNoResults: boolean;
		filterNfts?: boolean;
		filterZeroBalance?: boolean;
		filterQuery?: string;
		filterNetwork?: Network;
		filterCategoryTag?: TokenCategoryTagValue;
		networkSelectorViewOnly?: boolean;
		networks?: Network[];
		onTokenButtonClick: (token: Token) => void;
		onFiltersChange?: () => void;
	}

	let {
		tokens,
		renderNoResults,
		filterNfts = false,
		filterZeroBalance = false,
		filterQuery = '',
		filterNetwork,
		filterCategoryTag,
		networkSelectorViewOnly = false,
		networks,
		onTokenButtonClick,
		onFiltersChange
	}: Props = $props();

	setContext<ModalTokensListContext>(
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		// eslint-disable-next-line svelte/no-unused-svelte-ignore
		// svelte-ignore state_referenced_locally -- set once, as the modals do
		initModalTokensListContext({
			tokens,
			filterZeroBalance,
			filterNetwork,
			filterCategoryTag,
			filterQuery,
			filterNfts
		})
	);
</script>

<ModalTokensList {networkSelectorViewOnly} {networks} {onFiltersChange} {onTokenButtonClick}>
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
