<script lang="ts">
	import Hr from '$lib/components/ui/Hr.svelte';
	import { createEventDispatcher, getContext } from 'svelte';
	import ReceiveAddress from '$icp-eth/components/receive/ReceiveAddress.svelte';
	import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
	import { nonNullish } from '@dfinity/utils';
	import { formatToken } from '$lib/utils/format.utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { fade } from 'svelte/transition';
	import { btcAddressStore } from '$icp/stores/btc.store';
	import { BTC_DECIMALS } from '$env/tokens.btc.env';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import IcReceiveWalletAddress from '$icp/components/receive/IcReceiveWalletAddress.svelte';
	import {
		RECEIVE_TOKEN_CONTEXT_KEY,
		type ReceiveTokenContext
	} from '$icp/stores/receive-token.store';

	const { tokenId, close } = getContext<ReceiveTokenContext>(RECEIVE_TOKEN_CONTEXT_KEY);

	const dispatch = createEventDispatcher();

	const displayQRCode = (addressType: string) => dispatch('icQRCode', addressType);

	let btcAddress: string | undefined = undefined;
	$: btcAddress = $btcAddressStore?.[$tokenId]?.data;

	let kytFee: bigint | undefined = undefined;
	$: kytFee = $ckBtcMinterInfoStore?.[$tokenId]?.data.kyt_fee;
</script>

<div class="stretch">
	<IcReceiveWalletAddress on:icQRCode />

	{#if nonNullish(btcAddress)}
		<div class="mb-6">
			<Hr />
		</div>

		<ReceiveAddress
			labelRef="bitcoin-address"
			address={btcAddress}
			qrCodeAriaLabel={$i18n.receive.bitcoin.text.display_bitcoin_address_qr}
			copyAriaLabel={$i18n.receive.bitcoin.text.bitcoin_address_copied}
			on:click={() => displayQRCode(btcAddress ?? '')}
		>
			<svelte:fragment slot="title">{$i18n.receive.bitcoin.text.bitcoin_address}</svelte:fragment>
			<svelte:fragment slot="text"
				>{$i18n.receive.bitcoin.text.from_network}&nbsp;{#if nonNullish(kytFee)}<span in:fade
						>{replacePlaceholders($i18n.receive.bitcoin.text.fee_applied, {
							$fee: formatToken({
								value: BigNumber.from(kytFee),
								unitName: BTC_DECIMALS,
								displayDecimals: BTC_DECIMALS
							})
						})}</span
					>{/if}
			</svelte:fragment>
		</ReceiveAddress>
	{/if}
</div>

<button class="primary full center text-center" on:click={close}>{$i18n.core.text.done}</button>
