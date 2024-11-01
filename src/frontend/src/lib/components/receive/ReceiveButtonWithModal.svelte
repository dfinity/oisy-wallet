<script lang="ts">
	import ReceiveButton from '$lib/components/receive/ReceiveButton.svelte';
	import { modalStore } from '$lib/stores/modal.store';

	export let open: (modalId: symbol) => void | Promise<void>;
	export let isOpen: boolean;
	export let modalId: symbol | undefined = undefined;
	export let loading = true;

	let definedModalId: symbol;
	$: definedModalId = modalId ?? Symbol();
</script>

<ReceiveButton on:click={async () => await open(definedModalId)} {loading} />

{#if isOpen && $modalStore?.data === definedModalId}
	<slot name="modal" />
{/if}
