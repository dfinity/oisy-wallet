<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { i18n } from '$lib/stores/i18n.store';
	import IcReceiveWalletAddress from '$icp/components/receive/IcReceiveWalletAddress.svelte';
</script>

<IcReceiveWalletAddress on:icQRCode />

<button class="primary full center text-center mt-8 mb-6" on:click={modalStore.close}
	>{$i18n.core.text.done}</button
>
