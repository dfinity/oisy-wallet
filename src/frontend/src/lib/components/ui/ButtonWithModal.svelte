<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import type { Snippet } from 'svelte';

	interface Props {
		open: (modalId: symbol) => void;
		isOpen: boolean;
		modal: Snippet;
		button: Snippet<[onclick: () => void]>;
	}

	const { open, isOpen, modal, button }: Props = $props();

	const modalId = Symbol();
</script>

{@render button(() => open(modalId))}

{#if isOpen && $modalStore?.id === modalId}
	{@render modal()}
{/if}
