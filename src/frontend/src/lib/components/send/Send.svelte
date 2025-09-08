<script lang="ts">
	import SendButtonWithModal from '$lib/components/send/SendButtonWithModal.svelte';
	import SendModal from '$lib/components/send/SendModal.svelte';
	import { modalSend } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';

	export let isTransactionsPage: boolean;
	export let isNftsPage: boolean;
</script>

<SendButtonWithModal
	isOpen={$modalSend}
	open={(id) => modalStore.openSend({ id, data: undefined })}
>
	<SendModal slot="modal" {isTransactionsPage} {isNftsPage} on:nnsClose />
</SendButtonWithModal>
