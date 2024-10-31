<script lang="ts">
	import SendButton from '$lib/components/send/SendButton.svelte';
	import { modalStore } from '$lib/stores/modal.store';

	export let open: (modalId: symbol) => void;
	export let isOpen: boolean;
	export let disabled = false;

	const modalId = Symbol();
</script>

<SendButton {disabled} on:click={() => open(modalId)} />

{#if isOpen && $modalStore?.data === modalId}
	<slot name="modal" />
{/if}
