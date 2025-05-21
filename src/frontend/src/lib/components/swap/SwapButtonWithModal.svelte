<script lang="ts">
	import type { Snippet } from 'svelte';
	import SwapButton from '$lib/components/swap/SwapButton.svelte';
	import { modalStore } from '$lib/stores/modal.store';

	interface Props {
		open: (modalId: symbol) => void;
		isOpen: boolean;
		children: Snippet;
	}

	let { open, isOpen, children }: Props = $props();

	const modalId = Symbol();
</script>

<SwapButton onclick={() => open(modalId)} />

{#if isOpen && $modalStore?.id === modalId}
	{@render children()}
{/if}
