<script lang="ts">
	import SwapButton from '$lib/components/swap/SwapButton.svelte';
	import { modalStore } from '$lib/stores/modal.store';

	export let open: (modalId: symbol) => void;
	export let isOpen: boolean;

	const modalId = Symbol();
</script>

<SwapButton on:click={() => open(modalId)} />

{#if isOpen && $modalStore?.id === modalId}
	<slot />
{/if}
