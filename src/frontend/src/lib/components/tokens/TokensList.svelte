<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { untrack } from 'svelte';
	import { flip } from 'svelte/animate';
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
	import { allTokens } from '$lib/derived/all-tokens.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { tokenListStore } from '$lib/stores/token-list.store';
	import type { Network } from '$lib/types/network';
	import type { Token } from '$lib/types/token';
	import type { TokenUiOrGroupUi } from '$lib/types/token-group';
	import { transactionsUrl } from '$lib/utils/nav.utils';
	import { isTokenUiGroup, sortTokenOrGroupUi } from '$lib/utils/token-group.utils';
	import { getDisabledOrModifiedTokens, getFilteredTokenList } from '$lib/utils/token-list.utils';
	import { saveAllCustomTokens } from '$lib/utils/tokens.utils';

	let tokens: TokenUiOrGroupUi[] | undefined = $state();

	let animating = $state(false);

	const handleAnimationStart = () => {
		animating = true;

		// The following is to guarantee that the function is triggered, even if 'animationend' event is not triggered.
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

	// Default token / tokengroup list
	let filteredTokens: TokenUiOrGroupUi[] | undefined = $derived(
		getFilteredTokenList({ filter: $tokenListStore.filter, list: tokens ?? [] })
	);

	// Token list for enabling when filtering
	let enableMoreTokensList: TokenUiOrGroupUi[] = $state([]);

	const updateFilterList = ({
		filter,
		selectedNetwork
	}: {
		filter: string;
		selectedNetwork?: Network;
	}) => {
		// sort alphabetally and apply filter
		enableMoreTokensList = getFilteredTokenList({
			filter,
			list: sortTokenOrGroupUi(
				getDisabledOrModifiedTokens({ $allTokens, modifiedTokens, selectedNetwork })
			)
		});

		// we need to reset modified tokens, since the filter has changed, the selected token(s) may not be visible anymore
		modifiedTokens = {};
	};

	// we debounce the filter input for updating the enable tokens list
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
		await saveAllCustomTokens({ tokens: modifiedTokens, $authIdentity, $i18n });

		// we need to update the filter list after a save to ensure the tokens got the newest backend "version"
		updateFilterList({ filter: $tokenListStore.filter, selectedNetwork: $selectedNetwork });
		saveLoading = false;
	};

	let modifiedTokens: Record<string, Token> = $state({});
	let modifiedTokensLen = $derived(Object.keys(modifiedTokens).length);

	let saveDisabled = $derived(Object.keys(modifiedTokens).length === 0);

	const onToggle = ({ detail: { id, network, ...rest } }: CustomEvent<Token>) => {
		const { id: networkId } = network;
		const { [`${networkId.description}-${id.description}`]: current, ...tokens } = modifiedTokens;

		if (nonNullish(current)) {
			modifiedTokens = { ...tokens };
			return;
		}

		modifiedTokens = {
			[`${networkId.description}-${id.description}`]: { id, network, ...rest },
			...tokens
		};
	};
</script>

<TokensDisplayHandler bind:tokens>
	<TokensSkeletons {loading}>
		<div class="flex flex-col gap-3" class:mb-12={filteredTokens?.length > 0}>
			{#each filteredTokens as tokenOrGroup (isTokenUiGroup(tokenOrGroup) ? tokenOrGroup.group.id : tokenOrGroup.token.id)}
				<div
					class="overflow-hidden rounded-xl"
					class:pointer-events-none={animating}
					onanimationend={handleAnimationEnd}
					onanimationstart={handleAnimationStart}
					transition:fade
					animate:flip={{ duration: 250 }}
				>
					{#if isTokenUiGroup(tokenOrGroup)}
						{@const { group: tokenGroup } = tokenOrGroup}

						<TokenGroupCard {tokenGroup} />
					{:else}
						{@const { token } = tokenOrGroup}

						<div class="transition duration-300 hover:bg-primary">
							<TokenCard data={token} on:click={() => goto(transactionsUrl({ token }))} />
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
			<div class="mb-3 mt-6 flex flex-col gap-3">
				<StickyHeader>
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
								{#if modifiedTokensLen > 0}({modifiedTokensLen}){/if}
							</Button>
						</div>
					</div>
				</StickyHeader>

				{#each enableMoreTokensList as tokenOrGroup (isTokenUiGroup(tokenOrGroup) ? tokenOrGroup.group.id : tokenOrGroup.token.id)}
					<div
						class="overflow-hidden rounded-xl"
						class:pointer-events-none={animating}
						onanimationend={handleAnimationEnd}
						onanimationstart={handleAnimationStart}
						transition:fade
						animate:flip={{ duration: 250 }}
					>
						<div class="transition duration-300 hover:bg-primary">
							{#if !isTokenUiGroup(tokenOrGroup)}
								<TokenCard data={tokenOrGroup.token} {onToggle} />
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</TokensSkeletons>
</TokensDisplayHandler>
