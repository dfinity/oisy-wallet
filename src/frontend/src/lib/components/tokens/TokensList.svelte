<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { untrack } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { slide } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import NoTokensPlaceholder from '$lib/components/tokens/NoTokensPlaceholder.svelte';
	import NothingFoundPlaceholder from '$lib/components/tokens/NothingFoundPlaceholder.svelte';
	import TokenCard from '$lib/components/tokens/TokenCard.svelte';
	import TokenGroupCard from '$lib/components/tokens/TokenGroupCard.svelte';
	import TokenTypeFilterBar from '$lib/components/tokens/TokenTypeFilterBar.svelte';
	import TokensDisplayHandler from '$lib/components/tokens/TokensDisplayHandler.svelte';
	import TokensSkeletons from '$lib/components/tokens/TokensSkeletons.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import StickyHeader from '$lib/components/ui/StickyHeader.svelte';
	import { SLIDE_PARAMS } from '$lib/constants/transition.constants';
	import { allFungibleNetworkTokens } from '$lib/derived/all-network-tokens.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import { showTokenCategoryFilter, tokenCategoryFilter } from '$lib/derived/settings.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { tokenListStore } from '$lib/stores/token-list.store';
	import type { Network } from '$lib/types/network';
	import type { Token, TokenId } from '$lib/types/token';
	import type { TokenUi } from '$lib/types/token-ui';
	import type { TokenUiGroup, TokenUiOrGroupUi } from '$lib/types/token-ui-group';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { transactionsUrl } from '$lib/utils/nav.utils';
	import { isTokenUiGroup, sortTokenOrGroupUi } from '$lib/utils/token-group.utils';
	import { getDisabledOrModifiedTokens, getFilteredTokenList } from '$lib/utils/token-list.utils';
	import { filterTokensByCategory, getTokenCategoryTag } from '$lib/utils/token-tag.utils';
	import { isTokenToggleable } from '$lib/utils/token-toggleable.utils';
	import { saveAllCustomTokens } from '$lib/utils/tokens.utils';

	let tokens: TokenUiOrGroupUi[] | undefined = $state();

	let loading: boolean = $derived(isNullish(tokens));

	let tokenTypeFiltered: TokenUiOrGroupUi[] = $derived(
		$showTokenCategoryFilter
			? filterTokensByCategory({ tokens: tokens ?? [], category: $tokenCategoryFilter })
			: (tokens ?? [])
	);

	let filteredTokens: TokenUiOrGroupUi[] | undefined = $derived(
		getFilteredTokenList({ filter: $tokenListStore.filter, list: tokenTypeFiltered })
	);

	// Token list for enabling when filtering
	let enableMoreTokensListRaw: TokenUiOrGroupUi[] = $state([]);

	let enableMoreTokensList: TokenUiOrGroupUi[] = $derived(
		$showTokenCategoryFilter
			? filterTokensByCategory({
					tokens: enableMoreTokensListRaw,
					category: $tokenCategoryFilter
				})
			: enableMoreTokensListRaw
	);

	const updateFilterList = ({ filter }: { filter: string }) => {
		// Sort alphabetically and apply filter
		enableMoreTokensListRaw = getFilteredTokenList({
			filter,
			list: sortTokenOrGroupUi(
				getDisabledOrModifiedTokens({
					tokens: $allFungibleNetworkTokens,
					modifiedTokens
				})
			)
		});

		// We need to reset modified tokens; since the filter has changed, the selected token(s) may not be visible anymore
		modifiedTokens.clear();
	};

	// we debounce the filter input for updating the enabled tokens list
	const debouncedFilterList = debounce(
		(params: { filter: string; selectedNetwork?: Network }) => updateFilterList(params),
		300
	);

	$effect(() => {
		const { filter } = $tokenListStore;
		const network = $selectedNetwork;
		untrack(() => debouncedFilterList({ filter, selectedNetwork: network })); // we untrack the function so it only updates the list on filter change
	});

	let saveLoading = $state(false);

	const onSave = async () => {
		saveLoading = true;
		await saveAllCustomTokens({ tokens: tokensToBeSaved, $authIdentity, $i18n });

		// we need to update the filter list after a save to ensure the tokens got the newest backend "version"
		updateFilterList({ filter: $tokenListStore.filter });
		saveLoading = false;
	};

	const modifiedTokens = new SvelteMap<TokenId, Token>();

	let tokensToBeSaved = $derived([...modifiedTokens.values()]);

	let tokensToBeSavedLength = $derived(tokensToBeSaved.length);

	let saveDisabled = $derived(tokensToBeSavedLength === 0);

	const onToggle = ({ id, ...rest }: Token) => {
		const current = modifiedTokens.get(id);

		if (nonNullish(current)) {
			modifiedTokens.delete(id);
			return;
		}

		modifiedTokens.set(id, { id, ...rest });
	};

	const tokenKey = ({ id: tokenId, network: { id: networkId } }: TokenUi): string =>
		`token:${tokenId.description}:${networkId.description}`;

	const groupKey = ({ id }: TokenUiGroup): string => `group:${id.description}`;

	const getUiKey = (tokenOrGroup: TokenUiOrGroupUi): string =>
		isTokenUiGroup(tokenOrGroup) ? groupKey(tokenOrGroup.group) : tokenKey(tokenOrGroup.token);

	let tokensWithKey = $derived(
		filteredTokens.map((tokenOrGroup) => ({ tokenOrGroup, key: getUiKey(tokenOrGroup) }))
	);

	let enableMoreTokensWithKey = $derived(
		enableMoreTokensList.map((tokenOrGroup) => ({ tokenOrGroup, key: getUiKey(tokenOrGroup) }))
	);

	let disabledCategoryTokenCount: number = $derived.by(() => {
		if (!$showTokenCategoryFilter || isNullish($tokenCategoryFilter)) {
			return 0;
		}

		return $allFungibleNetworkTokens.filter(
			(token) =>
				isTokenToggleable(token) &&
				!token.enabled &&
				getTokenCategoryTag(token) === $tokenCategoryFilter
		).length;
	});
</script>

<TokensDisplayHandler bind:tokens>
	<TokensSkeletons {loading}>
		{#if $showTokenCategoryFilter}
			<div class="mb-4" transition:slide={SLIDE_PARAMS}>
				<TokenTypeFilterBar />
			</div>
		{/if}

		<div class="flex flex-col gap-3" class:mb-12={filteredTokens?.length > 0}>
			{#each tokensWithKey as { tokenOrGroup, key } (key)}
				<div class="overflow-hidden rounded-xl">
					{#if isTokenUiGroup(tokenOrGroup)}
						{@const { group: tokenGroup } = tokenOrGroup}

						<TokenGroupCard {tokenGroup} />
					{:else}
						{@const { token } = tokenOrGroup}

						<div class="hover:bg-primary transition-colors duration-300">
							<TokenCard data={token} onClick={() => goto(transactionsUrl({ token }))} />
						</div>
					{/if}
				</div>
			{/each}
		</div>

		{#if filteredTokens?.length === 0}
			{#if $showTokenCategoryFilter && nonNullish($tokenCategoryFilter)}
				<NothingFoundPlaceholder
					description={disabledCategoryTokenCount > 0
						? replacePlaceholders($i18n.tokens.text.no_tokens_for_asset_type_description, {
								$count: `${disabledCategoryTokenCount}`
							})
						: ''}
					title={replacePlaceholders(
						disabledCategoryTokenCount > 0
							? $i18n.tokens.text.no_tokens_for_asset_type
							: $i18n.tokens.text.no_tokens_for_asset_type_zero_tokens,
						{
							$asset_type:
								$i18n.token_tag.category[$tokenCategoryFilter].toLocaleLowerCase($currentLanguage)
						}
					)}
				/>
			{:else if $tokenListStore.filter === ''}
				<NoTokensPlaceholder />
			{:else}
				<NothingFoundPlaceholder />
			{/if}
		{/if}

		{#if $tokenListStore.filter !== '' && enableMoreTokensList.length > 0}
			<div class="mt-6 mb-3 flex flex-col gap-3">
				<StickyHeader>
					{#snippet header()}
						<div class="flex items-center justify-between pb-4">
							<h2 class="text-base">{$i18n.tokens.manage.text.enable_more_assets}</h2>
							<div>
								<Button
									disabled={saveDisabled || saveLoading}
									fullWidth={false}
									loading={saveLoading}
									onclick={onSave}
									paddingSmall
									styleClass="py-2"
								>
									{$i18n.core.text.apply}
									{#if tokensToBeSavedLength > 0}({tokensToBeSavedLength}){/if}
								</Button>
							</div>
						</div>
					{/snippet}

					{#each enableMoreTokensWithKey as { tokenOrGroup, key } (key)}
						<div class="overflow-hidden rounded-xl">
							<div class="hover:bg-primary transition-colors duration-300">
								{#if !isTokenUiGroup(tokenOrGroup)}
									<TokenCard data={tokenOrGroup.token} {onToggle} />
								{/if}
							</div>
						</div>
					{/each}
				</StickyHeader>
			</div>
		{/if}
	</TokensSkeletons>
</TokensDisplayHandler>
