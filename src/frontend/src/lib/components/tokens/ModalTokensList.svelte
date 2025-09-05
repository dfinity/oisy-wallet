<script lang="ts">
	import { IconExpandMore } from '@dfinity/gix-components';
	import { notEmptyString } from '@dfinity/utils';
	import { createEventDispatcher, getContext, type Snippet } from 'svelte';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import TokensSkeletons from '$lib/components/tokens/TokensSkeletons.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import InputSearch from '$lib/components/ui/InputSearch.svelte';
	import { MODAL_TOKEN_LIST_DEFAULT_NO_RESULTS } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';
	import type { Token } from '$lib/types/token';
	import { isDesktop } from '$lib/utils/device.utils';

	let {
		networkSelectorViewOnly = false,
		loading,
		tokenListItem,
		toolbar,
		noResults
	}: {
		networkSelectorViewOnly: boolean;
		loading: boolean;
		tokenListItem: Snippet<[Token, () => void]>;
		toolbar: Snippet;
		noResults?: Snippet;
	} = $props();

	const dispatch = createEventDispatcher();

	const { filteredTokens, filterNetwork, filterQuery, setFilterQuery } =
		getContext<ModalTokensListContext>(MODAL_TOKENS_LIST_CONTEXT_KEY);

	let filter = $state($filterQuery ?? '');

	$effect(() => {
		setFilterQuery(filter);
	});

	let noTokensMatch = $derived($filteredTokens.length === 0);
</script>

<div>
	<div class="input-field condensed mb-4 flex-1">
		<InputSearch
			autofocus={isDesktop()}
			placeholder={$i18n.tokens.placeholder.search_token}
			showResetButton={notEmptyString(filter)}
			bind:filter
		/>
	</div>

	<div class="flex items-center">
		<button
			class="dropdown-button h-[2.2rem] rounded-lg border border-solid border-primary"
			class:hover:border-brand-primary={networkSelectorViewOnly}
			aria-label={$filterNetwork?.name ?? $i18n.networks.chain_fusion}
			disabled={networkSelectorViewOnly}
			onclick={() => !networkSelectorViewOnly && dispatch('icSelectNetworkFilter')}
		>
			<span class="font-medium">{$filterNetwork?.name ?? $i18n.networks.chain_fusion}</span>
			<IconExpandMore size="24" />
		</button>
	</div>
</div>

<div class="my-4 flex flex-col overflow-y-hidden sm:max-h-[26rem]">
	<div class="gap-6 overflow-y-auto overscroll-contain">
		<TokensSkeletons {loading}>
			{#if noTokensMatch}
				{#if noResults}
					{@render noResults()}
				{:else}
					<p class="text-primary" data-tid={MODAL_TOKEN_LIST_DEFAULT_NO_RESULTS}>
						{$i18n.core.text.no_results}
					</p>
				{/if}
			{:else}
				<List noPadding>
					{#each $filteredTokens as token (token.id)}
						<ListItem styleClass="first-of-type:border-t-1">
							{@render tokenListItem(token, () => dispatch('icTokenButtonClick', token))}
						</ListItem>
					{/each}
				</List>
			{/if}
		</TokensSkeletons>
	</div>
</div>

<ButtonGroup>
	{@render toolbar()}
</ButtonGroup>
