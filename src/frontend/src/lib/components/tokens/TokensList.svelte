<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { erc20UserTokensNotInitialized } from '$eth/derived/erc20.derived';
	import Listener from '$lib/components/core/Listener.svelte';
	import ManageTokensModal from '$lib/components/manage/ManageTokensModal.svelte';
	import NoTokensPlaceholder from '$lib/components/tokens/NoTokensPlaceholder.svelte';
	import NothingFoundPlaceholder from '$lib/components/tokens/NothingFoundPlaceholder.svelte';
	import TokenCard from '$lib/components/tokens/TokenCard.svelte';
	import TokenGroupCard from '$lib/components/tokens/TokenGroupCard.svelte';
	import TokensDisplayHandler from '$lib/components/tokens/TokensDisplayHandler.svelte';
	import TokensSkeletons from '$lib/components/tokens/TokensSkeletons.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { modalManageTokens, modalManageTokensData } from '$lib/derived/modal.derived';
	import { tokenListStore } from '$lib/stores/token-list.store';
	import type { TokenUiOrGroupUi } from '$lib/types/token-group';
	import { transactionsUrl } from '$lib/utils/nav.utils';
	import { isTokenUiGroup } from '$lib/utils/token-group.utils';
	import { getFilteredTokenList } from '$lib/utils/token-list.utils';
	import { pinEnabledTokensAtTop, sortTokens } from '$lib/utils/tokens.utils';
	import type { ExchangesData } from '$lib/types/exchange';
	import { onMount } from 'svelte';
	import { exchanges } from '$lib/derived/exchange.derived';
	import type { Token, TokenUi } from '$lib/types/token';
	import { allTokens } from '$lib/derived/all-tokens.derived';
	import { tokensToPin } from '$lib/derived/tokens.derived';
	import { mapTokenUi } from '$lib/utils/token.utils';
	import { balancesStore } from '$lib/stores/balances.store';

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

	let loading: boolean = $derived($erc20UserTokensNotInitialized || isNullish(tokens));

	let filteredTokens: TokenUiOrGroupUi[] | undefined = $derived(
		getFilteredTokenList({ filter: $tokenListStore.filter, list: tokens ?? [] })
	);

	// To avoid strange behavior when the exchange data changes (for example, the tokens may shift
	// since some of them are sorted by market cap), we store the exchange data in a variable during
	// the life of the component.
	let exchangesStaticData: ExchangesData | undefined = $state();

	onMount(() => {
		exchangesStaticData = nonNullish($exchanges) ? { ...$exchanges } : undefined;
	});

	let allTokensSorted: TokenUiOrGroupUi[] = $derived(
		getFilteredTokenList({
			filter: $tokenListStore.filter,
			list: (nonNullish(exchangesStaticData)
				? pinEnabledTokensAtTop(
						sortTokens({
							$tokens: $allTokens,
							$exchanges: exchangesStaticData,
							$tokensToPin
						})
					)
				: []
			).map((t) => ({
				token: mapTokenUi({ token: t, $balances: $balancesStore, $exchanges })
			})) as TokenUiOrGroupUi[]
		})
	);

	let {
		initialSearch,
		message
	}: { initialSearch: string | undefined; message?: string | undefined } = $derived(
		nonNullish($modalManageTokensData)
			? $modalManageTokensData
			: { initialSearch: undefined, message: undefined }
	);
</script>

<TokensDisplayHandler bind:tokens>
	<TokensSkeletons {loading}>
		<div class="mb-3 flex flex-col gap-3">
			{#each filteredTokens as tokenOrGroup (isTokenUiGroup(tokenOrGroup) ? tokenOrGroup.group.id : tokenOrGroup.token.id)}
				<div
					class="overflow-hidden rounded-xl"
					transition:fade
					animate:flip={{ duration: 250 }}
					on:animationstart={handleAnimationStart}
					on:animationend={handleAnimationEnd}
					class:pointer-events-none={animating}
				>
					{#if isTokenUiGroup(tokenOrGroup)}
						{@const { group: tokenGroup } = tokenOrGroup}

						<TokenGroupCard {tokenGroup} />
					{:else}
						{@const { token } = tokenOrGroup}

						<Listener {token}>
							<div class="transition duration-300 hover:bg-primary">
								<TokenCard data={token} on:click={() => goto(transactionsUrl({ token }))} />
							</div>
						</Listener>
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

		{#if $tokenListStore.filter !== ''}
			<div class="mb-3 mt-12 flex flex-col gap-3">
				<h2 class="text-base">Enable more assets</h2>

				{#each allTokensSorted as tokenOrGroup (isTokenUiGroup(tokenOrGroup) ? tokenOrGroup.group.id : tokenOrGroup.token.id)}
					<div
						class="overflow-hidden rounded-xl"
						transition:fade
						animate:flip={{ duration: 250 }}
						on:animationstart={handleAnimationStart}
						on:animationend={handleAnimationEnd}
						class:pointer-events-none={animating}
					>
						<div class="transition duration-300 hover:bg-primary">
							{#if !isTokenUiGroup(tokenOrGroup)}
								<TokenCard data={tokenOrGroup.token} togglable />
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}

		{#if $modalManageTokens}
			<ManageTokensModal {initialSearch}>
				{#snippet infoElement()}
					{#if nonNullish(message)}
						<MessageBox level="info">
							{message}
						</MessageBox>
					{/if}
				{/snippet}
			</ManageTokensModal>
		{/if}
	</TokensSkeletons>
</TokensDisplayHandler>
