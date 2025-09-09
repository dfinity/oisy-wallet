<script lang="ts">
	import SendButtonWithModal from '$lib/components/send/SendButtonWithModal.svelte';
	import SendModal from '$lib/components/send/SendModal.svelte';
	import { modalSend } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import SendButton from '$lib/components/send/SendButton.svelte';

	interface Props {
		isTransactionsPage: boolean;
	}

	const { isTransactionsPage }: Props = $props();
</script>

<SendButtonWithModal isOpen={$modalSend} open={modalStore.openSend}>
	{#snippet button(onclick)}
		<SendButton {onclick} />
	{/snippet}
	{#snippet modal()}
		<SendModal {isTransactionsPage} on:nnsClose />
	{/snippet}
</SendButtonWithModal>
