<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import { NFTS_ENABLED } from '$env/nft.env';
	import ManageTokensModal from '$lib/components/manage/ManageTokensModal.svelte';
	import NftsList from '$lib/components/nfts/NftsList.svelte';
	import ManageTokensButton from '$lib/components/tokens/ManageTokensButton.svelte';
	import TokensFilter from '$lib/components/tokens/TokensFilter.svelte';
	import TokensList from '$lib/components/tokens/TokensList.svelte';
	import TokensMenu from '$lib/components/tokens/TokensMenu.svelte';
	import Header from '$lib/components/ui/Header.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import StickyHeader from '$lib/components/ui/StickyHeader.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import { modalManageTokens, modalManageTokensData } from '$lib/derived/modal.derived';
	import { i18n } from '$lib/stores/i18n.store';

	let activeTab = $state('tokens');

	let {
		initialSearch,
		message
	}: { initialSearch: string | undefined; message?: string | undefined } = $derived(
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
							<!--							TODO add tests from i18n -->
							<Tabs
								bind:activeTab
								tabs={[
									{ label: 'Tokens', id: 'tokens' },
									{ label: 'NFTs', id: 'nfts' }
								]}
								tabVariant="menu"
							/>
						{:else}
							<Header><span class="mt-2 flex">{$i18n.tokens.text.title}</span></Header>
						{/if}
					{/snippet}
				</TokensFilter>
			</div>
			<div class="flex">
				<TokensMenu />
			</div>
		</div>
	</StickyHeader>

	{#if activeTab === 'tokens'}
		<TokensList />
	{:else}
		<NftsList />
	{/if}

	<div in:fade class="mb-4 mt-12 flex w-full justify-center sm:w-auto">
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
