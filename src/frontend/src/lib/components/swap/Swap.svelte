<script lang="ts">
	import SwapButton from '$lib/components/swap/SwapButton.svelte';
	import SwapContexts from '$lib/components/swap/SwapContexts.svelte';
	import SwapLoader from '$lib/components/swap/SwapLoader.svelte';
	import SwapModal from '$lib/components/swap/SwapModal.svelte';
	import { modalSwap } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';

	const modalId = Symbol();

	const onSwapReady = () => {
		modalStore.openSwap(modalId);
	};
</script>

<SwapContexts>
	<SwapLoader>
		{#snippet button(onclick)}
			<SwapButton onclick={() => onclick(onSwapReady)} />
		{/snippet}
	</SwapLoader>

	{#if $modalSwap && $modalStore?.id === modalId}
		<SwapModal />
	{/if}
</SwapContexts>
