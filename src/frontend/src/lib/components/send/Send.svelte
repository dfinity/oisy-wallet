<script lang="ts">
	import ButtonWithModal from '$lib/components/ui/ButtonWithModal.svelte';
	import SendModal from '$lib/components/send/SendModal.svelte';
	import { modalSend } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import SendButton from '$lib/components/send/SendButton.svelte';

	interface Props {
		isTransactionsPage: boolean;
	}

	const { isTransactionsPage }: Props = $props();
</script>

<ButtonWithModal isOpen={$modalSend} open={modalStore.openSend}>
	{#snippet button(onclick)}
		<SendButton {onclick} />
	{/snippet}
	{#snippet modal()}
		<SendModal {isTransactionsPage} on:nnsClose />
	{/snippet}
</ButtonWithModal>
