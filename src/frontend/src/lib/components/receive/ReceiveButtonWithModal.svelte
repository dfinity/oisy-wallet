<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import ReceiveButton from '$lib/components/receive/ReceiveButton.svelte';

	export let openModal: (modalId: symbol) => void | Promise<void>;
	export let isOpen: boolean;
	export let specificModalId: symbol | undefined = undefined;

	const modalId = specificModalId ?? Symbol();
</script>

<ReceiveButton on:click={async () => await openModal(modalId)} />

{#if isOpen && $modalStore?.data === modalId}
	<slot name="modal" />
{/if}
