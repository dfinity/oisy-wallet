<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { fade } from 'svelte/transition';
	import ManageTokensModal from '$lib/components/manage/ManageTokensModal.svelte';
	import NFTsList from '$lib/components/nfts/NFTsList.svelte';
	import ManageTokensButton from '$lib/components/tokens/ManageTokensButton.svelte';
	import TokensFilter from '$lib/components/tokens/TokensFilter.svelte';
	import TokensList from '$lib/components/tokens/TokensList.svelte';
	import TokensMenu from '$lib/components/tokens/TokensMenu.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import StickyHeader from '$lib/components/ui/StickyHeader.svelte';
	import { modalManageTokens, modalManageTokensData } from '$lib/derived/modal.derived';
	import { TokenType } from '$lib/enums/token-type';
	import TokensTabMenu from '$lib/components/tokens/TokensTabMenu.svelte';
	import Header from '$lib/components/ui/Header.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { NFTS_ENABLED } from '$env/nft.env';

	let selectedTokenType = $state(TokenType.TOKEN);

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
							<TokensTabMenu bind:selectedTokenType />
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

	{#if selectedTokenType === TokenType.TOKEN}
		<TokensList />
	{:else}
		<NFTsList />
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
