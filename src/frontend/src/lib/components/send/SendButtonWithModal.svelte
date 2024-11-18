<script lang="ts">
	import SendButton from '$lib/components/send/SendButton.svelte';
	import { modalStore } from '$lib/stores/modal.store';

	export let open: (modalId: symbol) => void;
	export let isOpen: boolean;

	const modalId = Symbol();
</script>

<SendButton on:click={() => open(modalId)} />

{#if isOpen && $modalStore?.id === modalId}
	<slot name="modal" />
{/if}
