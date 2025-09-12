<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store.js';
	import IconSendMessage from '$lib/components/icons/IconSendMessage.svelte';
	import NftActionButton from '$lib/components/nfts/NftActionButton.svelte';
	import ButtonWithModal from '$lib/components/ui/ButtonWithModal.svelte';
	import SendModal from '$lib/components/send/SendModal.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalSend } from '$lib/derived/modal.derived.js';
	import type { Nft } from '$lib/types/nft';
	import { NFT_ACTION_SEND } from '$lib/constants/test-ids.constants';

	interface Props {
		nft: Nft;
	}

	const { nft }: Props = $props();
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
			<SendModal isNftsPage isTransactionsPage={false} {nft} />
		{/snippet}
	</ButtonWithModal>
</div>
