<script lang="ts">
	import type { Snippet } from 'svelte';
	import LimitOrderModal from '$lib/components/trading/limit-order/LimitOrderModal.svelte';
	import { modalLimitOrder } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';

	interface Props {
		// Renders the trigger; `open` opens the limit-order modal.
		trigger: Snippet<[() => void]>;
	}

	let { trigger }: Props = $props();

	const modalId = Symbol();

	const open = () => modalStore.openLimitOrder(modalId);
</script>

{@render trigger(open)}

{#if $modalLimitOrder && $modalStore?.id === modalId}
	<LimitOrderModal />
{/if}
