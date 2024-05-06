<script lang="ts">
	import { modalStore } from '$lib/stores/modal.store';
	import { i18n } from '$lib/stores/i18n.store';
	import IcReceiveWalletAddress from '$icp/components/receive/IcReceiveWalletAddress.svelte';
</script>

<div class="stretch">
	<IcReceiveWalletAddress on:icQRCode />
</div>

<button class="primary full center text-center" on:click={modalStore.close}
	>{$i18n.core.text.done}</button
>
