<script lang="ts">
	import { notEmptyString } from '@dfinity/utils';
	import { createEventDispatcher, getContext } from 'svelte';
	import NetworkSwitcherLogo from '$lib/components/networks/NetworkSwitcherLogo.svelte';
	import ModalTokensListItem from '$lib/components/tokens/ModalTokensListItem.svelte';
	import TokensSkeletons from '$lib/components/tokens/TokensSkeletons.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import InputSearch from '$lib/components/ui/InputSearch.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';
	import { isDesktop } from '$lib/utils/device.utils';

	export let networkSelectorViewOnly = false;
	export let loading: boolean;

	const dispatch = createEventDispatcher();

	const { filteredTokens, filterNetwork, filterQuery, setFilterQuery } =
		getContext<ModalTokensListContext>(MODAL_TOKENS_LIST_CONTEXT_KEY);

	let filter = $filterQuery ?? '';

	$: filter, setFilterQuery(filter);

	let noTokensMatch = false;
	$: noTokensMatch = $filteredTokens.length === 0;
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
		on:click={() => !networkSelectorViewOnly && dispatch('icSelectNetworkFilter')}
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
				<p class="text-primary">
					{$i18n.tokens.manage.text.all_tokens_zero_balance}
				</p>
			{:else}
				<ul class="list-none">
					{#each $filteredTokens as token (token.id)}
						<li class="logo-button-list-item">
							<ModalTokensListItem
								on:click={() => dispatch('icTokenButtonClick', token)}
								data={token}
							/>
						</li>
					{/each}
				</ul>
			{/if}
		</TokensSkeletons>
	</div>
</div>

<ButtonGroup>
	<slot name="toolbar" />
</ButtonGroup>
