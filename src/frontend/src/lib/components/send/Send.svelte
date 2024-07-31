<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { modalSend } from '$lib/derived/modal.derived';
	import SendButton from '$lib/components/send/SendButton.svelte';
	import SendModal from '$lib/components/send/SendModal.svelte';

	const modalId = Symbol();
</script>

<SendButton on:click={() => modalStore.openSend(modalId)} />

{#if $modalSend && $modalStore?.data === modalId}
	<SendModal on:nnsClose />
{/if}
