<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import { page } from '$app/state';
	import { EARNING_ENABLED } from '$env/earning';
	import { anyLendBorrowProviderEnabled } from '$env/lend-borrow';
	import { anyTradingProviderEnabled } from '$env/trading';
	import BorrowingsList from '$lib/components/borrowings/BorrowingsList.svelte';
	import GoToBorrowButton from '$lib/components/borrowings/GoToBorrowButton.svelte';
	import EarningsList from '$lib/components/earning/EarningsList.svelte';
	import GoToEarnButton from '$lib/components/earning/GoToEarnButton.svelte';
	import ManageTokensModal from '$lib/components/manage/ManageTokensModal.svelte';
	import Nft from '$lib/components/nfts/Nft.svelte';
	import NftCollection from '$lib/components/nfts/NftCollection.svelte';
	import NftSettingsMenu from '$lib/components/nfts/NftSettingsMenu.svelte';
	import NftSortMenu from '$lib/components/nfts/NftSortMenu.svelte';
	import NftsList from '$lib/components/nfts/NftsList.svelte';
	import RefreshCollectionsButton from '$lib/components/nfts/RefreshCollectionsButton.svelte';
	import ManageTokensButton from '$lib/components/tokens/ManageTokensButton.svelte';
	import TokensFilter from '$lib/components/tokens/TokensFilter.svelte';
	import TokensList from '$lib/components/tokens/TokensList.svelte';
	import TokensMenu from '$lib/components/tokens/TokensMenu.svelte';
	import TokensSortMenu from '$lib/components/tokens/TokensSortMenu.svelte';
	import GoToTradeButton from '$lib/components/trading/GoToTradeButton.svelte';
	import TradingList from '$lib/components/trading/TradingList.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import StickyHeader from '$lib/components/ui/StickyHeader.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import { modalManageTokens, modalManageTokensData } from '$lib/derived/modal.derived';
	import { routeCollection, routeNetwork, routeNft } from '$lib/derived/nav.derived';
	import { oisyTradeHasAssets } from '$lib/derived/oisy-trade.derived';
	import { PLAUSIBLE_EVENTS } from '$lib/enums/plausible';
	import { TokenTypes } from '$lib/enums/token-types';
	import { i18n } from '$lib/stores/i18n.store';
	import { activeAssetsTabStore } from '$lib/stores/settings.store';
	import type { ManageTokensData } from '$lib/types/manage-tokens';

	interface Props {
		tab: TokenTypes;
	}

	let { tab }: Props = $props();

	// TODO: check if there is a better way to handle this svelte-ignore
	// eslint-disable-next-line svelte/no-unused-svelte-ignore
	// svelte-ignore state_referenced_locally -- we want to get only the initial value
	let activeTab = $state(tab);

	let { initialSearch, message, initialNetwork, initialTokenData, initialStep } = $derived(
		nonNullish($modalManageTokensData) ? $modalManageTokensData : ({} as ManageTokensData)
	);

	// NFTs is a standalone destination now, not a real Assets tab (its tab bar
	// is hidden below), so visiting it must not overwrite the last real tab the
	// user picked among Tokens/Earning/Trading/Borrowing.
	$effect(() => {
		if (activeTab !== TokenTypes.NFTS) {
			activeAssetsTabStore.set({ key: 'active-assets-tab', value: activeTab });
		}
	});
</script>

{#if nonNullish($routeNft) && nonNullish($routeCollection) && nonNullish($routeNetwork)}
	<Nft />
{:else if nonNullish($routeCollection) && nonNullish($routeNetwork)}
	<NftCollection />
{:else}
	<div>
		<StickyHeader>
			{#snippet header()}
				<div class="flex w-full justify-between">
					<!-- min-w-0: without it this flex item won't shrink below its
					     tab row's natural width on narrow viewports (see the
					     matching note in SlidingInput.svelte). -->
					<div class="relative flex min-w-0 grow-1 justify-between">
						<TokensFilter>
							{#snippet overflowableContent()}
								<!-- NFTs is its own nav destination now, so the standalone NFTs page
								     shows no Tokens/Earning/Trading tab bar. -->
								{#if tab !== TokenTypes.NFTS}
									<Tabs
										styleClass="mt-2 mb-6"
										tabVariant="menu"
										tabs={[
											{
												label: $i18n.tokens.text.title,
												id: TokenTypes.TOKENS,
												path: `${AppPath.Tokens}${page.url.search}`
											},
											...(anyTradingProviderEnabled
												? [
														{
															label: $i18n.trading.text.tab_title,
															shortLabel: $i18n.navigation.text.trade,
															id: TokenTypes.TRADING,
															path: `${AppPath.Trading}${page.url.search}`
														}
													]
												: []),
											...(EARNING_ENABLED
												? [
														{
															label: $i18n.earning.text.tab_title,
															shortLabel: $i18n.navigation.text.earning,
															id: TokenTypes.EARNING,
															path: `${AppPath.Earning}${page.url.search}`
														}
													]
												: []),
											...(anyLendBorrowProviderEnabled
												? [
														{
															label: $i18n.borrowings.text.tab_title,
															shortLabel: $i18n.navigation.text.borrow,
															id: TokenTypes.BORROWINGS,
															path: `${AppPath.Borrowings}${page.url.search}`
														}
													]
												: [])
										]}
										trackEventName={PLAUSIBLE_EVENTS.VIEW_OPEN}
										bind:activeTab
									/>
								{/if}
							{/snippet}
						</TokensFilter>
					</div>
					{#if tab === TokenTypes.TOKENS}
						<div class="flex">
							<TokensSortMenu />
						</div>
						<div class="ml-1 flex">
							<TokensMenu />
						</div>
					{:else if tab === TokenTypes.NFTS}
						<div class="flex">
							<RefreshCollectionsButton />
						</div>
						<div class="ml-1 flex">
							<NftSortMenu />
						</div>
						<div class="ml-1 flex">
							<NftSettingsMenu />
						</div>
					{/if}
				</div>
			{/snippet}

			{#if activeTab === TokenTypes.TOKENS}
				<TokensList />
			{:else if activeTab === TokenTypes.NFTS}
				<NftsList />
			{:else if activeTab === TokenTypes.EARNING}
				<EarningsList />
			{:else if activeTab === TokenTypes.TRADING}
				<TradingList />
			{:else if activeTab === TokenTypes.BORROWINGS}
				<BorrowingsList />
			{/if}
		</StickyHeader>

		<div class="mt-4 mb-4 flex w-full justify-center sm:mt-12 sm:w-auto" in:fade>
			{#if activeTab === TokenTypes.TOKENS || activeTab === TokenTypes.NFTS}
				<ManageTokensButton>
					{#snippet label()}
						{#if activeTab === TokenTypes.TOKENS}
							{$i18n.tokens.manage.text.manage_list}
						{:else if activeTab === TokenTypes.NFTS}
							{$i18n.tokens.manage.text.manage_list_nft}
						{/if}
					{/snippet}
				</ManageTokensButton>
			{:else if activeTab === TokenTypes.EARNING}
				<GoToEarnButton />
			{:else if activeTab === TokenTypes.TRADING && $oisyTradeHasAssets}
				<!-- Empty Trading tab shows its own Go-to-Trade button inside the
				     onboarding info box (see TradingList); only the populated list
				     needs the button down here. -->
				<GoToTradeButton />
			{:else if activeTab === TokenTypes.BORROWINGS}
				<GoToBorrowButton />
			{/if}
		</div>
	</div>
{/if}

{#if $modalManageTokens}
	<ManageTokensModal {initialNetwork} {initialSearch} {initialStep} {initialTokenData}>
		{#snippet infoElement()}
			{#if nonNullish(message)}
				<MessageBox level="info">
					{message}
				</MessageBox>
			{/if}
		{/snippet}
	</ManageTokensModal>
{/if}
