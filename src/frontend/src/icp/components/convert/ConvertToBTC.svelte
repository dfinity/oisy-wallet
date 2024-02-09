<script lang="ts">
	import { isBusy } from '$lib/derived/busy.derived';
	import { modalConvertCkBTCToBTC } from '$lib/derived/modal.derived';
	import IcSendModal from '$icp/components/send/IcSendModal.svelte';
	import { BTC_NETWORK_ID } from '$icp/constants/ckbtc.constants';
	import { modalStore } from '$lib/stores/modal.store';
	import IconBurn from '$lib/components/icons/IconBurn.svelte';
	import { tokenCkBtcLedger } from '$icp/derived/ic-token.derived';
	import { waitWalletReady } from '$lib/services/actions.services';
	import { ckBtcMinterInfoNotLoaded } from '$icp/derived/ckbtc.derived';

	const isDisabled = (): boolean => $ckBtcMinterInfoNotLoaded;

	const openSend = async () => {
		if ($tokenCkBtcLedger) {
			const status = await waitWalletReady(isDisabled);

			console.log(status);

			if (status === 'timeout') {
				return;
			}
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
	<IconBurn size="28" />
	Convert to BTC
</button>

{#if $modalConvertCkBTCToBTC}
	<IcSendModal networkId={BTC_NETWORK_ID} />
{/if}
