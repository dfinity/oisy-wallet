<script lang="ts">
	import SendModal from '$lib/components/send/SendModal.svelte';
	import SendButton from '$lib/components/send/SendButton.svelte';
	import ButtonWithModal from '$lib/components/ui/ButtonWithModal.svelte';
	import { modalSend } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';

	interface Props {
		isTransactionsPage: boolean;
	}

	const { isTransactionsPage }: Props = $props();
</script>

<ButtonWithModal isOpen={$modalSend} onOpen={modalStore.openSend}>
	{#snippet button(onclick)}
		<SendButton {onclick} />
	{/snippet}
	{#snippet modal()}
		<SendModal {isTransactionsPage} />
	{/snippet}
</ButtonWithModal>
