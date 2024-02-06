<script lang="ts">
	import { isBusy } from '$lib/derived/busy.derived';
	import { modalConvertCkBTCToBTC } from '$lib/derived/modal.derived';
	import IcSendModal from '$icp/components/send/IcSendModal.svelte';
	import { BTC_NETWORK_ID } from '$icp/constants/ckbtc.constants';
	import { modalStore } from '$lib/stores/modal.store';
	import IconImportExport from '$lib/components/icons/IconImportExport.svelte';
	import { tokenCkBtcLedger } from '$icp/derived/ic-token.derived';
	import { loadCkBtcMinterInfo } from '$icp/services/ckbtc.services';
	import { token } from '$lib/derived/token.derived';
	import type { IcToken } from '$icp/types/ic';

	const openSend = async () => {
		if ($tokenCkBtcLedger) {
			await loadCkBtcMinterInfo({ params: $token as IcToken });
		}

		modalStore.openConvertCkBTCToBTC();
	};
</script>

<button
	class="hero col-span-2"
	disabled={$isBusy}
	class:opacity-50={$isBusy}
	on:click={async () => await openSend()}
>
	<IconImportExport size="28" />
	Convert to BTC
</button>

{#if $modalConvertCkBTCToBTC}
	<IcSendModal networkId={BTC_NETWORK_ID} />
{/if}
