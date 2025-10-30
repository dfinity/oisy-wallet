<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { untrack } from 'svelte';
	import { flip } from 'svelte/animate';
	import { SvelteMap } from 'svelte/reactivity';
	import { fade } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import NoTokensPlaceholder from '$lib/components/tokens/NoTokensPlaceholder.svelte';
	import NothingFoundPlaceholder from '$lib/components/tokens/NothingFoundPlaceholder.svelte';
	import TokenCard from '$lib/components/tokens/TokenCard.svelte';
	import TokenGroupCard from '$lib/components/tokens/TokenGroupCard.svelte';
	import TokensDisplayHandler from '$lib/components/tokens/TokensDisplayHandler.svelte';
	import TokensSkeletons from '$lib/components/tokens/TokensSkeletons.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import StickyHeader from '$lib/components/ui/StickyHeader.svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { fungibleNetworkTokens } from '$lib/derived/network-tokens.derived';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { tokenListStore } from '$lib/stores/token-list.store';
	import type { Network } from '$lib/types/network';
	import type { Token, TokenId } from '$lib/types/token';
	import type { TokenUi } from '$lib/types/token-ui';
	import type { TokenUiGroup, TokenUiOrGroupUi } from '$lib/types/token-ui-group';
	import { isIos } from '$lib/utils/device.utils';
	import { transactionsUrl } from '$lib/utils/nav.utils';
	import { isTokenUiGroup, sortTokenOrGroupUi } from '$lib/utils/token-group.utils';
	import { getDisabledOrModifiedTokens, getFilteredTokenList } from '$lib/utils/token-list.utils';
	import { saveAllCustomTokens } from '$lib/utils/tokens.utils';

	let tokens: TokenUiOrGroupUi[] | undefined = $state();

	let animating = $state(false);

	const handleAnimationStart = () => {
		animating = true;

		// The following is to guarantee that the function is triggered, even if the 'animationend' event is not triggered.
		// It may happen if the animation aborts before reaching completion.
		debouncedHandleAnimationEnd();
	};

	const handleAnimationEnd = () => (animating = false);

	const debouncedHandleAnimationEnd = debounce(() => {
		if (animating) {
			handleAnimationEnd();
		}
	}, 250);

	let loading: boolean = $derived(isNullish(tokens));

	// Default token / tokenGroup list
	let filteredTokens: TokenUiOrGroupUi[] | undefined = $derived(
		getFilteredTokenList({ filter: $tokenListStore.filter, list: tokens ?? [] })
	);

	// Token list for enabling when filtering
	let enableMoreTokensList: TokenUiOrGroupUi[] = $state([]);

	const updateFilterList = ({ filter }: { filter: string }) => {
		// Sort alphabetically and apply filter
		enableMoreTokensList = getFilteredTokenList({
			filter,
			list: sortTokenOrGroupUi(
				getDisabledOrModifiedTokens({
					tokens: $fungibleNetworkTokens,
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

	let ios = $derived(isIos());

	let flipParams = $derived({ duration: ios ? 0 : 250 });

	const tokenKey = ({ id: tokenId, network: { id: networkId } }: TokenUi): string =>
		`token:${tokenId.description}:${networkId.description}`;

	const groupKey = ({ id }: TokenUiGroup): string => `group:${id.description}`;

	const getUiKey = (tokenOrGroup: TokenUiOrGroupUi): string =>
		isTokenUiGroup(tokenOrGroup) ? groupKey(tokenOrGroup.group) : tokenKey(tokenOrGroup.token);
</script>

<TokensDisplayHandler {animating} bind:tokens>
	<TokensSkeletons {loading}>
		<div class="flex flex-col gap-3" class:mb-12={filteredTokens?.length > 0}>
			{#each filteredTokens as tokenOrGroup (getUiKey(tokenOrGroup))}
				<div
					class="overflow-hidden rounded-xl"
					class:pointer-events-none={animating}
					onanimationend={handleAnimationEnd}
					onanimationstart={handleAnimationStart}
					transition:fade
					animate:flip={flipParams}
				>
					{#if isTokenUiGroup(tokenOrGroup)}
						{@const { group: tokenGroup } = tokenOrGroup}

						<TokenGroupCard {tokenGroup} />
					{:else}
						{@const { token } = tokenOrGroup}

						<div class="transition duration-300 hover:bg-primary">
							<TokenCard data={token} onClick={() => goto(transactionsUrl({ token }))} />
						</div>
					{/if}
				</div>
			{/each}
		</div>

		{#if filteredTokens?.length === 0}
			{#if $tokenListStore.filter === ''}
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

					{#each enableMoreTokensList as tokenOrGroup (getUiKey(tokenOrGroup))}
						<div
							class="overflow-hidden rounded-xl"
							class:pointer-events-none={animating}
							onanimationend={handleAnimationEnd}
							onanimationstart={handleAnimationStart}
							transition:fade
							animate:flip={flipParams}
						>
							<div class="transition duration-300 hover:bg-primary">
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
