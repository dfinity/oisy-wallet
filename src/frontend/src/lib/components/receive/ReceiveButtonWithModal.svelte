<script lang="ts">
	import type { Snippet } from 'svelte';
	import ReceiveButton from '$lib/components/receive/ReceiveButton.svelte';
	import { modalStore } from '$lib/stores/modal.store';

	interface Props {
		// eslint-disable-next-line svelte/require-event-prefix -- It sounds better without the prefix
		open: (modalId: symbol) => void | Promise<void>;
		isOpen: boolean;
		modalId?: symbol;
		modal: Snippet;
	}

	let { open, isOpen, modalId, modal }: Props = $props();

	let definedModalId = $derived(modalId ?? Symbol());
</script>

<ReceiveButton onClick={async () => await open(definedModalId)} />

{#if isOpen && $modalStore?.id === definedModalId}
	{@render modal()}
{/if}
