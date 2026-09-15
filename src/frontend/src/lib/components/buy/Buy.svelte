<script lang="ts">
	import BuyButton from '$lib/components/buy/BuyButton.svelte';
	import BuyModal from '$lib/components/buy/BuyModal.svelte';
	import { MOBILE_APP_BUY_ENABLED } from '$lib/constants/mobile-flags.constants';
	import { modalBuy } from '$lib/derived/modal.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import { isNativePlatform } from '$lib/utils/device.utils';

	const modalId = Symbol();

	// In the native shell the Onramper flow is untested (and its widget URL
	// signing depends on backend provisioning) — hidden until verified.
	const visible = !isNativePlatform() || MOBILE_APP_BUY_ENABLED;
</script>

{#if visible}
	<BuyButton
		onclick={() => {
			modalStore.openBuy(modalId);
		}}
	/>

	{#if $modalBuy && $modalStore?.id === modalId}
		<BuyModal />
	{/if}
{/if}
