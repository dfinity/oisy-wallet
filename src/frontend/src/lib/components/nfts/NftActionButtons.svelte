<script lang="ts">
	import IconSendMessage from '$lib/components/icons/IconSendMessage.svelte';
	import NftActionButton from '$lib/components/nfts/NftActionButton.svelte';
	import SendModal from '$lib/components/send/SendModal.svelte';
	import ButtonWithModal from '$lib/components/ui/ButtonWithModal.svelte';
	import { NFT_ACTION_SEND } from '$lib/constants/test-ids.constants';
	import { modalSend } from '$lib/derived/modal.derived.js';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store.js';
	import type { NonFungibleToken } from '$lib/types/nft';
	import NftSpamButton from '$lib/components/nfts/NftSpamButton.svelte';
	import NftHideButton from '$lib/components/nfts/NftHideButton.svelte';
	import { findNftsByToken } from '$lib/utils/nfts.utils';
	import { nftStore } from '$lib/stores/nft.store';
	import { nonNullish } from '@dfinity/utils';
	import ConfirmButtonWithModal from '$lib/components/ui/ConfirmButtonWithModal.svelte';

	interface Props {
		token: NonFungibleToken;
	}

	let { token }: Props = $props();
</script>

<div class="flex gap-2">
	<ButtonWithModal isOpen={$modalSend} onOpen={modalStore.openSend}>
		{#snippet button(onclick)}
			<NftActionButton
				colorStyle="primary"
				label={$i18n.send.text.send}
				{onclick}
				testId={NFT_ACTION_SEND}
			>
				{#snippet icon()}
					<IconSendMessage size="18" />
				{/snippet}
			</NftActionButton>
		{/snippet}
		{#snippet modal()}
			<SendModal isNftsPage isTransactionsPage={false} />
		{/snippet}
	</ButtonWithModal>
</div>
