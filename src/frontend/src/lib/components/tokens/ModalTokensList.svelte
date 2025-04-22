<script lang="ts">
	import { notEmptyString } from '@dfinity/utils';
	import { createEventDispatcher, getContext, type Snippet } from 'svelte';
	import NetworkSwitcherLogo from '$lib/components/networks/NetworkSwitcherLogo.svelte';
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

<div class="flex items-end justify-between">
	<div class="mr-3 flex-1">
		<InputSearch
			bind:filter
			showResetButton={notEmptyString(filter)}
			placeholder={$i18n.tokens.placeholder.search_token}
			autofocus={isDesktop()}
		/>
	</div>

	<button
		class="dropdown-button h-[3.375rem] rounded-lg border border-solid border-primary"
		class:hover:border-brand-primary={!networkSelectorViewOnly}
		disabled={networkSelectorViewOnly}
		onclick={() => !networkSelectorViewOnly && dispatch('icSelectNetworkFilter')}
		aria-label={$filterNetwork?.name ?? $i18n.networks.chain_fusion}
	>
		<NetworkSwitcherLogo network={$filterNetwork} />

		<span class="hidden md:block">{$filterNetwork?.name ?? $i18n.networks.chain_fusion}</span>
	</button>
</div>

<div class="my-6 flex flex-col overflow-y-hidden sm:max-h-[26rem]">
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
				<ul class="list-none">
					{#each $filteredTokens as token (token.id)}
						<li class="logo-button-list-item">
							{@render tokenListItem(token, () => dispatch('icTokenButtonClick', token))}
						</li>
					{/each}
				</ul>
			{/if}
		</TokensSkeletons>
	</div>
</div>

<ButtonGroup>
	{@render toolbar()}
</ButtonGroup>
