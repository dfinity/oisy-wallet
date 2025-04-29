<script lang="ts">
	import ReceiveButton from '$lib/components/receive/ReceiveButton.svelte';
	import { modalStore } from '$lib/stores/modal.store';

	export let open: (modalId: symbol) => void | Promise<void>;
	export let isOpen: boolean;
	export let modalId: symbol | undefined = undefined;

	let definedModalId: symbol;
	$: definedModalId = modalId ?? Symbol();
</script>

<ReceiveButton onclick={async () => await open(definedModalId)} />

{#if isOpen && $modalStore?.id === definedModalId}
	<slot name="modal" />
{/if}
