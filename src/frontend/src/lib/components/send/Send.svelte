<script lang="ts">
	import SendButtonWithModal from '$lib/components/send/SendButtonWithModal.svelte';
	import SendModal from '$lib/components/send/SendModal.svelte';
	import { modalSend } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import SendButton from '$lib/components/send/SendButton.svelte';

	export let isTransactionsPage: boolean;
	export let isNftsPage: boolean;
</script>

<SendButtonWithModal isOpen={$modalSend} open={modalStore.openSend}>
	{#snippet button(onclick)}
		<SendButton {onclick} />
	{/snippet}
	{#snippet modal()}
		<SendModal {isNftsPage} {isTransactionsPage} on:nnsClose />
	{/snippet}
</SendButtonWithModal>
