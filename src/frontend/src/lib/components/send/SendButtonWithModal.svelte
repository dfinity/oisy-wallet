<script lang="ts">
	import type { Snippet } from 'svelte';
	import SendButton from '$lib/components/send/SendButton.svelte';
	import { modalStore } from '$lib/stores/modal.store';

	interface Props {
		open: (modalId: symbol) => void;
		isOpen: boolean;
		modal?: Snippet;
	}

	let { open, isOpen, modal }: Props = $props();

	const modalId = Symbol();
</script>

<SendButton onclick={() => open(modalId)} />

{#if isOpen && $modalStore?.id === modalId}
	{@render modal?.()}
{/if}
