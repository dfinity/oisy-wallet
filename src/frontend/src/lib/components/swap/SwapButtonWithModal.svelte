<script lang="ts">
	import type { Snippet } from 'svelte';
	import SwapButton from '$lib/components/swap/SwapButton.svelte';
	import { modalStore } from '$lib/stores/modal.store';

	interface Props {
		onOpen: (modalId: symbol) => void;
		isOpen: boolean;
		children: Snippet;
	}

	let { onOpen, isOpen, children }: Props = $props();

	const modalId = Symbol();
</script>

<SwapButton onclick={() => onOpen(modalId)} />

{#if isOpen && $modalStore?.id === modalId}
	{@render children()}
{/if}
