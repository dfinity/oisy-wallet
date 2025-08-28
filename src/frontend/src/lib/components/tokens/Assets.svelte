<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import { NFTS_ENABLED } from '$env/nft.env';
	import ManageTokensModal from '$lib/components/manage/ManageTokensModal.svelte';
	import NftSettingsMenu from '$lib/components/nfts/NftSettingsMenu.svelte';
	import NftSortMenu from '$lib/components/nfts/NftSortMenu.svelte';
	import NftsList from '$lib/components/nfts/NftsList.svelte';
	import ManageTokensButton from '$lib/components/tokens/ManageTokensButton.svelte';
	import TokensFilter from '$lib/components/tokens/TokensFilter.svelte';
	import TokensList from '$lib/components/tokens/TokensList.svelte';
	import TokensMenu from '$lib/components/tokens/TokensMenu.svelte';
	import Header from '$lib/components/ui/Header.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import StickyHeader from '$lib/components/ui/StickyHeader.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import { modalManageTokens, modalManageTokensData } from '$lib/derived/modal.derived';
	import { TokenTypes } from '$lib/enums/token-types';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		tab?: TokenTypes;
	}

	let { tab = TokenTypes.TOKENS }: Props = $props();

	let activeTab = $state(tab);

	let { initialSearch, message } = $derived(
		nonNullish($modalManageTokensData)
			? $modalManageTokensData
			: { initialSearch: undefined, message: undefined }
	);
</script>

<div>
	<StickyHeader>
		<div class="flex w-full justify-between">
			<div class="grow-1 relative flex justify-between">
				<TokensFilter>
					{#snippet overflowableContent()}
						{#if NFTS_ENABLED}
							<Tabs
								styleClass="mt-2 mb-8"
								tabVariant="menu"
								tabs={[
									{ label: $i18n.tokens.text.title, id: TokenTypes.TOKENS, path: AppPath.Tokens },
									{ label: $i18n.nfts.text.title, id: TokenTypes.NFTS, path: AppPath.Nfts }
								]}
								bind:activeTab
							/>
						{:else}
							<Header><span class="mt-2 flex">{$i18n.tokens.text.title}</span></Header>
						{/if}
					{/snippet}
				</TokensFilter>
			</div>
			{#if tab === TokenTypes.TOKENS}
				<div class="flex">
					<TokensMenu />
				</div>
			{:else}
				<div class="flex">
					<NftSortMenu />
				</div>
				<div class="flex">
					<NftSettingsMenu />
				</div>
			{/if}
		</div>
	</StickyHeader>

	{#if activeTab === TokenTypes.TOKENS}
		<TokensList />
	{:else}
		<NftsList />
	{/if}

	<div class="mb-4 mt-12 flex w-full justify-center sm:w-auto" in:fade>
		<ManageTokensButton />
	</div>
</div>

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
