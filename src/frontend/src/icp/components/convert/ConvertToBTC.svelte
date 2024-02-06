<script lang="ts">
	import { isBusy } from '$lib/derived/busy.derived';
	import { modalConvertCkBTCToBTC } from '$lib/derived/modal.derived';
	import IcSendModal from '$icp/components/send/IcSendModal.svelte';
	import { BTC_NETWORK_ID } from '$icp/constants/ckbtc.constants';
	import { modalStore } from '$lib/stores/modal.store';
	import IconImportExport from '$lib/components/icons/IconImportExport.svelte';
</script>

<button
	class="hero col-span-2"
	disabled={$isBusy}
	class:opacity-50={$isBusy}
	on:click={() => modalStore.openConvertCkBTCToBTC()}
>
	<IconImportExport size="28" />
	Convert to BTC
</button>

{#if $modalConvertCkBTCToBTC}
	<IcSendModal networkId={BTC_NETWORK_ID} />
{/if}
