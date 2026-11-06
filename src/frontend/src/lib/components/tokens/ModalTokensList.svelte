<script lang="ts">
	import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';
	import { getContext, type Snippet } from 'svelte';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import NetworkFilterDropdown from '$lib/components/networks/NetworkFilterDropdown.svelte';
	import TokenCategoryFilterDropdown from '$lib/components/tokens/TokenCategoryFilterDropdown.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import InputSearch from '$lib/components/ui/InputSearch.svelte';
	import {
		MODAL_TOKEN_LIST_CLEAR_FILTERS,
		MODAL_TOKEN_LIST_DEFAULT_NO_RESULTS,
		MODAL_TOKEN_LIST_NO_MATCH,
		MODAL_TOKENS_LIST
	} from '$lib/constants/test-ids.constants';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { showTokenCategoryFilter } from '$lib/derived/settings.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';
	import type { Network } from '$lib/types/network';
	import type { Token } from '$lib/types/token';
	import { isDesktop } from '$lib/utils/device.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { getNoTokensMatchMessage } from '$lib/utils/modal-tokens-list.utils';
	import { filterTokensForSelectedNetwork } from '$lib/utils/network.utils';
	import { filterTokensUiByCategory, getTokensCategories } from '$lib/utils/token-tag.utils';

	interface Props {
		networkSelectorViewOnly?: boolean;
		// The networks the network filter offers; every mainnet when absent.
		networks?: Network[];
		showStakeBalance?: boolean;
		tokenListItem: Snippet<[Token, () => void]>;
		toolbar: Snippet;
		noResults?: Snippet;
		topBanner?: Snippet;
		onTokenButtonClick?: (token: Token) => void;
	}

	let {
		networkSelectorViewOnly = false,
		networks,
		showStakeBalance = true,
		tokenListItem,
		toolbar,
		noResults,
		topBanner,
		onTokenButtonClick
	}: Props = $props();

	const {
		eligibleTokens,
		filteredTokens,
		filterNetwork,
		setFilterNetwork,
		filterQuery,
		setFilterQuery,
		filterCategoryTag,
		setFilterCategoryTag
	} = getContext<ModalTokensListContext>(MODAL_TOKENS_LIST_CONTEXT_KEY);

	let filter = $state('');

	let seeded = $state(false);

	$effect(() => {
		if (seeded) {
			return;
		}

		filter = $filterQuery ?? '';

		seeded = true;
	});

	$effect(() => {
		setFilterQuery(filter);
	});

	// A network or asset type the list does not offer (carried in from the assets page, or kept from a
	// visit with other tokens) reads as "all", without being cleared, so it applies again where it fits.
	// A network the picker locks always applies.
	let network = $derived(
		networkSelectorViewOnly ||
			isNullish($filterNetwork) ||
			isNullish(networks) ||
			networks.some(({ id }) => id === $filterNetwork.id)
			? $filterNetwork
			: undefined
	);

	// Only the asset types among the tokens the list can offer, before the search: a type with nothing
	// to pick (a stock with no balance where only funded tokens show) is never offered. On a network the
	// picker locks, only that network's tokens count, since no other network can be picked.
	let categories = $derived(
		getTokensCategories(
			networkSelectorViewOnly
				? filterTokensForSelectedNetwork([$eligibleTokens, network, isNullish(network)])
				: $eligibleTokens
		)
	);

	let category = $derived(
		$showTokenCategoryFilter &&
			nonNullish($filterCategoryTag) &&
			categories.includes($filterCategoryTag)
			? $filterCategoryTag
			: undefined
	);

	let networkTokens = $derived(
		filterTokensForSelectedNetwork([$filteredTokens, network, isNullish(network)])
	);

	let displayTokens = $derived(filterTokensUiByCategory({ tokens: networkTokens, category }));

	let noTokensMatch = $derived(displayTokens.length === 0);

	let canClearNetwork = $derived(!networkSelectorViewOnly && nonNullish(network));

	// What clearing the filters would show: the query stays, and so does a network the picker locks.
	// All networks means mainnets only, as `networkTokens` reads it without a network.
	let tokensWithoutFilters = $derived(
		canClearNetwork
			? filterTokensForSelectedNetwork([$filteredTokens, undefined, true])
			: networkTokens
	);

	let canClearFilters = $derived(
		noTokensMatch && (canClearNetwork || nonNullish(category)) && tokensWithoutFilters.length > 0
	);

	let showNoMatch = $derived(canClearFilters || notEmptyString(filter.trim()));

	let noMatchMessage = $derived(
		getNoTokensMatchMessage({
			i18n: $i18n,
			language: $currentLanguage,
			query: filter,
			network: canClearFilters || networkSelectorViewOnly ? network : undefined,
			category: canClearFilters ? category : undefined
		})
	);

	const clearFilters = () => {
		setFilterCategoryTag(undefined);

		if (!networkSelectorViewOnly) {
			setFilterNetwork(undefined);
		}
	};

	let searchPlaceholder = $derived(
		nonNullish(network)
			? replacePlaceholders($i18n.tokens.placeholder.search_token_on_network, {
					$network: network.name
				})
			: $i18n.tokens.placeholder.search_token
	);

	// The list never shrinks while the modal is open, so narrowing it with a filter does not pull the
	// modal's bottom edge up under the pointer. Desktop only: on a phone the modal fills the screen. The
	// height is capped at the desktop maximum, since one taken on a phone can be taller, and
	// `min-height` wins over `max-height`.
	let listHeight = $state(0);

	let listMinHeight = $state(0);

	$effect(() => {
		if (listHeight > listMinHeight) {
			listMinHeight = listHeight;
		}
	});
</script>

<div data-tid={MODAL_TOKENS_LIST}>
	{#if topBanner}
		{@render topBanner()}
	{/if}

	<div class="input-field condensed mb-3 flex-1">
		<InputSearch
			autofocus={isDesktop()}
			placeholder={searchPlaceholder}
			showResetButton={notEmptyString(filter)}
			bind:filter
		/>
	</div>

	<div class="flex min-w-0 items-center gap-2">
		<div class="flex min-w-0">
			<NetworkFilterDropdown
				locked={networkSelectorViewOnly}
				{networks}
				onSelect={setFilterNetwork}
				selectedNetwork={network}
				{showStakeBalance}
			/>
		</div>

		{#if $showTokenCategoryFilter}
			<div class="flex shrink-0">
				<TokenCategoryFilterDropdown
					{categories}
					onSelect={setFilterCategoryTag}
					selectedCategory={category}
				/>
			</div>
		{/if}
	</div>
</div>

<div
	style={`--list-max-height: 26rem; --list-min-height: min(${listMinHeight}px, var(--list-max-height))`}
	class="my-4 flex flex-col overflow-y-hidden sm:max-h-(--list-max-height) sm:min-h-(--list-min-height)"
	bind:clientHeight={listHeight}
>
	<div class="gap-6 overflow-y-auto overscroll-contain">
		{#if noTokensMatch}
			{#if showNoMatch}
				<div
					class="flex flex-col items-center gap-3 px-4 py-8 text-center"
					data-tid={MODAL_TOKEN_LIST_NO_MATCH}
				>
					<p class="text-primary">{noMatchMessage}</p>

					{#if canClearFilters}
						<Button
							colorStyle="secondary-light"
							onclick={clearFilters}
							paddingSmall
							testId={MODAL_TOKEN_LIST_CLEAR_FILTERS}
						>
							{$i18n.tokens.text.clear_filters}
						</Button>
					{/if}
				</div>
			{:else if noResults}
				{@render noResults()}
			{:else}
				<p class="text-primary" data-tid={MODAL_TOKEN_LIST_DEFAULT_NO_RESULTS}>
					{$i18n.core.text.no_results}
				</p>
			{/if}
		{:else}
			<List noPadding>
				{#each displayTokens as token (token.id)}
					<ListItem styleClass="first-of-type:border-t-1">
						{@render tokenListItem(token, () => onTokenButtonClick?.(token))}
					</ListItem>
				{/each}
			</List>
		{/if}
	</div>
</div>

<ButtonGroup>
	{@render toolbar()}
</ButtonGroup>
