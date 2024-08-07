<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import SendButton from '$lib/components/send/SendButton.svelte';

	export let openModal: (modalId: symbol) => void;
	export let isOpen: boolean;

	const modalId = Symbol();
</script>

<SendButton on:click={() => openModal(modalId)} />

{#if isOpen && $modalStore?.data === modalId}
	<slot name="modal" />
{/if}
