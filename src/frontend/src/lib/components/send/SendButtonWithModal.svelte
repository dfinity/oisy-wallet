<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import SendButton from '$lib/components/send/SendButton.svelte';

	export let open: (modalId: symbol) => void;
	export let isOpen: boolean;

	const modalId = Symbol();
</script>

<SendButton on:click={() => open(modalId)} />

{#if isOpen && $modalStore?.data === modalId}
	<slot name="modal" />
{/if}
