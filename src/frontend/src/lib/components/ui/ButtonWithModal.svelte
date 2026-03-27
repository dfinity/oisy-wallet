<script lang="ts">
	import type { Snippet } from 'svelte';
	import { modalStore } from '$lib/stores/modal.store';

	interface Props {
		onOpen: (modalId: symbol) => void;
		isOpen: boolean;
		modal: Snippet;
		button: Snippet<[onclick: () => void]>;
	}

	const { onOpen, isOpen, modal, button }: Props = $props();

	const modalId = Symbol();
</script>

{@render button(() => onOpen(modalId))}

{#if isOpen && $modalStore?.id === modalId}
	{@render modal()}
{/if}
