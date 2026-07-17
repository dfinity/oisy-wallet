<script lang="ts">
	import { notEmptyString } from '@dfinity/utils';
	import { getContext, untrack, type Snippet } from 'svelte';
	import List from '$lib/components/common/List.svelte';
	import ListItem from '$lib/components/common/ListItem.svelte';
	import TokenCategoryFilterDropdown from '$lib/components/tokens/TokenCategoryFilterDropdown.svelte';
	import TokenStandardFilterDropdown from '$lib/components/tokens/TokenStandardFilterDropdown.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import InputSearch from '$lib/components/ui/InputSearch.svelte';
	import ModalFilterButton from '$lib/components/ui/ModalFilterButton.svelte';
	import {
		MODAL_TOKEN_LIST_DEFAULT_NO_RESULTS,
		MODAL_TOKENS_LIST
	} from '$lib/constants/test-ids.constants';
	import { showTokenCategoryFilter, showTokenStandardFilter } from '$lib/derived/settings.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		MODAL_TOKENS_LIST_CONTEXT_KEY,
		type ModalTokensListContext
	} from '$lib/stores/modal-tokens-list.store';
	import type { Token, TokenStandard } from '$lib/types/token';
	import { isDesktop } from '$lib/utils/device.utils';
	import { filterTokensUiByCategory } from '$lib/utils/token-tag.utils';
	import { tokenStandardKey, tokenStandardsEqual } from '$lib/utils/token.utils';

	interface Props {
		networkSelectorViewOnly?: boolean;
		tokenListItem: Snippet<[Token, () => void]>;
		toolbar: Snippet;
		noResults?: Snippet;
		topBanner?: Snippet;
		onSelectNetworkFilter?: () => void;
		onTokenButtonClick?: (token: Token) => void;
	}

	let {
		networkSelectorViewOnly = false,
		tokenListItem,
		toolbar,
		noResults,
		topBanner,
		onSelectNetworkFilter,
		onTokenButtonClick
	}: Props = $props();

	const {
		filteredTokens,
		filterNetwork,
		filterQuery,
		setFilterQuery,
		filterCategoryTag,
		setFilterCategoryTag,
		filterStandard,
		setFilterStandard
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

	let categoryFilteredTokens = $derived(
		$showTokenCategoryFilter
			? filterTokensUiByCategory({ tokens: $filteredTokens, category: $filterCategoryTag })
			: $filteredTokens
	);

	let availableStandards = $derived.by<TokenStandard[]>(() => {
		const byKey: Record<string, TokenStandard> = {};
		for (const { standard } of categoryFilteredTokens) {
			const key = tokenStandardKey(standard);
			if (!(key in byKey)) {
				byKey[key] = { code: standard.code, version: standard.version };
			}
		}
		return Object.values(byKey).sort((a, b) =>
			tokenStandardKey(a).localeCompare(tokenStandardKey(b))
		);
	});

	$effect(() => {
		const selected = $filterStandard;
		const standards = availableStandards;

		untrack(() => {
			// Only auto-clear when there *are* standards to pick from but the
			// selected one isn't one of them (e.g. user switched network).
			// When the set is transiently empty (e.g. search clears the list),
			// keep the user's selection so it returns once the list rehydrates.
			if (
				selected !== undefined &&
				standards.length > 0 &&
				!standards.some((standard) => tokenStandardsEqual({ a: standard, b: selected }))
			) {
				setFilterStandard(undefined);
			}
		});
	});

	let displayTokens = $derived(
		$filterStandard === undefined
			? categoryFilteredTokens
			: categoryFilteredTokens.filter(
					({ standard }) =>
						$filterStandard !== undefined &&
						tokenStandardsEqual({ a: standard, b: $filterStandard })
				)
	);

	let noTokensMatch = $derived(displayTokens.length === 0);
</script>

<div data-tid={MODAL_TOKENS_LIST}>
	{#if topBanner}
		{@render topBanner()}
	{/if}

	<div class="input-field condensed mb-4 flex-1">
		<InputSearch
			autofocus={isDesktop()}
			placeholder={$i18n.tokens.placeholder.search_token}
			showResetButton={notEmptyString(filter)}
			bind:filter
		/>
	</div>

	<div class="flex items-stretch gap-2">
		<ModalFilterButton
			ariaLabel={$filterNetwork?.name ?? $i18n.networks.chain_fusion}
			disabled={networkSelectorViewOnly}
			onclick={() => !networkSelectorViewOnly && onSelectNetworkFilter?.()}
		>
			{$filterNetwork?.name ?? $i18n.networks.chain_fusion}
		</ModalFilterButton>

		{#if $showTokenCategoryFilter}
			<TokenCategoryFilterDropdown
				onSelect={setFilterCategoryTag}
				selectedCategory={$filterCategoryTag}
			/>
		{/if}

		{#if $showTokenStandardFilter}
			<TokenStandardFilterDropdown
				{availableStandards}
				onSelect={setFilterStandard}
				selectedStandard={$filterStandard}
			/>
		{/if}
	</div>
</div>

<div class="my-4 flex flex-col overflow-y-hidden sm:max-h-[26rem]">
	<div class="gap-6 overflow-y-auto overscroll-contain">
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
