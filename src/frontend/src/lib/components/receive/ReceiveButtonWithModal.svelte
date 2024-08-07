<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import ReceiveButton from '$lib/components/receive/ReceiveButton.svelte';

	export let openModal: (modalId: symbol) => void | Promise<void>;
	export let isOpen: boolean;
	export let modalId: symbol | undefined = undefined;

	let definedModalId: symbol;
	$: definedModalId = modalId ?? Symbol();
</script>

<ReceiveButton on:click={async () => await openModal(definedModalId)} />

{#if isOpen && $modalStore?.data === definedModalId}
	<slot name="modal" />
{/if}
