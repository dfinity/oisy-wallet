<script lang="ts">
	import { isBusy } from '$lib/derived/busy.derived';
	import { modalConvertCkBTCToBTC } from '$lib/derived/modal.derived';
	import IcSendModal from '$icp/components/send/IcSendModal.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import { waitWalletReady } from '$lib/services/actions.services';
	import { isNullish } from '@dfinity/utils';
	import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
	import { tokenId } from '$lib/derived/token.derived';
	import type { NetworkId } from '$lib/types/network';
	import type { OptionIcCkToken } from '$icp/types/ic';
	import { BTC_MAINNET_NETWORK_ID } from '$env/networks.env';
	import { i18n } from '$lib/stores/i18n.store';
	import { token } from '$lib/stores/token.store';
	import ButtonHero from '$lib/components/ui/ButtonHero.svelte';
	import IconConvert from '$lib/components/icons/IconConvert.svelte';

	const isDisabled = (): boolean =>
		isNullish($tokenId) || isNullish($ckBtcMinterInfoStore?.[$tokenId]);

	const openSend = async () => {
		const status = await waitWalletReady(isDisabled);

		if (status === 'timeout') {
			return;
		}

		modalStore.openConvertCkBTCToBTC();
	};

	let networkId: NetworkId;
	$: networkId = ($token as OptionIcCkToken)?.twinToken?.network.id ?? BTC_MAINNET_NETWORK_ID;
</script>

<ButtonHero
	disabled={$isBusy}
	on:click={async () => await openSend()}
	ariaLabel={$i18n.convert.text.convert_to_btc}
>
	<IconConvert size="28" slot="icon" />
	{$i18n.convert.text.convert_to_btc}
</ButtonHero>

{#if $modalConvertCkBTCToBTC}
	<IcSendModal {networkId} />
{/if}
