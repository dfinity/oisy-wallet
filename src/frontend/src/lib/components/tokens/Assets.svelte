<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { SvelteSet } from 'svelte/reactivity';
	import { fade } from 'svelte/transition';
	import { page } from '$app/state';
	import { EARNING_ENABLED } from '$env/earning';
	import { icrc7CustomTokensNotInitialized, icrc7Tokens } from '$icp/derived/icrc7.derived';
	import { resolveIcrc7CollectionDeepLinkAction } from '$icp/services/icrc7-deep-link.services';
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
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import StickyHeader from '$lib/components/ui/StickyHeader.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { modalManageTokens, modalManageTokensData } from '$lib/derived/modal.derived';
	import { routeCollection, routeNetwork, routeNft } from '$lib/derived/nav.derived';
	import { PLAUSIBLE_EVENTS } from '$lib/enums/plausible';
	import { TokenTypes } from '$lib/enums/token-types';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { activeAssetsTabStore } from '$lib/stores/settings.store';

	interface Props {
		tab: TokenTypes;
	}

	let { tab }: Props = $props();

	// TODO: check if there is a better way to handle this svelte-ignore
	// eslint-disable-next-line svelte/no-unused-svelte-ignore
	// svelte-ignore state_referenced_locally -- we want to get only the initial value
	let activeTab = $state(tab);

	const icrc7DeepLinkManageTokensId = Symbol();
	const handledIcrc7DeepLinkCanisterIds = new SvelteSet<string>();

	let { icrc7CanisterId, initialSearch, message } = $derived(
		nonNullish($modalManageTokensData)
			? $modalManageTokensData
			: { icrc7CanisterId: undefined, initialSearch: undefined, message: undefined }
	);

	const icrc7DeepLinkAction = $derived.by(() => {
		if (tab !== TokenTypes.NFTS || isNullish($authIdentity) || $icrc7CustomTokensNotInitialized) {
			return undefined;
		}

		return resolveIcrc7CollectionDeepLinkAction({
			url: page.url,
			tokens: $icrc7Tokens
		});
	});

	$effect(() => {
		activeAssetsTabStore.set({ key: 'active-assets-tab', value: activeTab });
	});

	$effect(() => {
		const action = icrc7DeepLinkAction;

		if (
			isNullish(action) ||
			action.type === 'ready' ||
			handledIcrc7DeepLinkCanisterIds.has(action.canisterId)
		) {
			return;
		}

		handledIcrc7DeepLinkCanisterIds.add(action.canisterId);

		if (action.type === 'import') {
			modalStore.openManageTokens({
				id: icrc7DeepLinkManageTokensId,
				data: {
					icrc7CanisterId: action.canisterId,
					initialSearch: action.canisterId
				}
			});
			return;
		}

		modalStore.openManageTokens({
			id: icrc7DeepLinkManageTokensId,
			data: {
				initialSearch: action.token.name,
				message: $i18n.transactions.text.token_needs_enabling
			}
		});
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
					<div class="relative flex grow-1 justify-between">
						<TokensFilter>
							{#snippet overflowableContent()}
								<Tabs
									styleClass="mt-2 mb-6"
									tabVariant="menu"
									tabs={[
										{
											label: $i18n.tokens.text.title,
											id: TokenTypes.TOKENS,
											path: `${AppPath.Tokens}${page.url.search}`
										},
										{
											label: $i18n.nfts.text.title,
											id: TokenTypes.NFTS,
											path: `${AppPath.Nfts}${page.url.search}`
										},
										...(EARNING_ENABLED
											? [
													{
														label: $i18n.earning.text.tab_title,
														id: TokenTypes.EARNING,
														path: `${AppPath.Earning}${page.url.search}`
													}
												]
											: [])
									]}
									trackEventName={PLAUSIBLE_EVENTS.VIEW_OPEN}
									bind:activeTab
								/>
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
			{/if}
		</div>
	</div>
{/if}

{#if $modalManageTokens}
	<ManageTokensModal {icrc7CanisterId} {initialSearch}>
		{#snippet infoElement()}
			{#if nonNullish(message)}
				<MessageBox level="info">
					{message}
				</MessageBox>
			{/if}
		{/snippet}
	</ManageTokensModal>
{/if}
