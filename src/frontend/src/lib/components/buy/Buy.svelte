<script lang="ts">
	import BuyButton from '$lib/components/buy/BuyButton.svelte';
	import BuyModal from '$lib/components/buy/BuyModal.svelte';
	import { modalBuy } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';

	const modalId = Symbol();
</script>

<BuyButton onclick={() => modalStore.openBuy(modalId)} />

{#if $modalBuy && $modalStore?.id === modalId}
	<BuyModal />
{/if}
