<script lang="ts">
	import SendButtonWithModal from '$lib/components/send/SendButtonWithModal.svelte';
	import SendModal from '$lib/components/send/SendModal.svelte';
	import { modalSend } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';

	interface Props {
		isTransactionsPage: boolean;
	}

	let { isTransactionsPage }: Props = $props();
</script>

<SendButtonWithModal open={modalStore.openSend} isOpen={$modalSend}>
	{#snippet modal()}
		<SendModal {isTransactionsPage} on:nnsClose />
	{/snippet}
</SendButtonWithModal>
