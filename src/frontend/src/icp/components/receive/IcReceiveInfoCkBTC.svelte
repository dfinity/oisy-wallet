<script lang="ts">
	import { icrcAccountIdentifierText } from '$icp/derived/ic.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { createEventDispatcher } from 'svelte';
	import ReceiveAddress from '$icp-eth/components/receive/ReceiveAddress.svelte';
	import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
	import { tokenId } from '$lib/derived/token.derived';
	import { nonNullish } from '@dfinity/utils';
	import { formatToken } from '$lib/utils/format.utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { fade } from 'svelte/transition';
	import { btcAddressStore } from '$icp/stores/btc.store';

	import { BTC_DECIMALS } from '$env/tokens.btc.env';
	import { i18n } from '$lib/stores/i18n.store';

	const dispatch = createEventDispatcher();

	const displayQRCode = (addressType: string) => dispatch('icQRCode', addressType);

	let btcAddress: string | undefined = undefined;
	$: btcAddress = $btcAddressStore?.[$tokenId]?.data;

	let kytFee: bigint | undefined = undefined;
	$: kytFee = $ckBtcMinterInfoStore?.[$tokenId]?.data.kyt_fee;
</script>

<ReceiveAddress
	labelRef="wallet-address"
	address={$icrcAccountIdentifierText ?? ''}
	qrCodeAriaLabel={$i18n.wallet.text.display_wallet_address_qr}
	copyAriaLabel={$i18n.wallet.text.wallet_address_copied}
	on:click={() => displayQRCode($icrcAccountIdentifierText ?? '')}
>
	<svelte:fragment slot="title">{$i18n.wallet.text.wallet_address}</svelte:fragment>
	<svelte:fragment slot="text">{$i18n.receive.ckbtc.text.use_address_from_to}</svelte:fragment>
</ReceiveAddress>

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
			>Transfer Bitcoin on the BTC network to this address to receive ckBTC. {#if nonNullish(kytFee)}<span
					in:fade
					>Please note that an estimated inter-network fee of {formatToken({
						value: BigNumber.from(kytFee),
						unitName: BTC_DECIMALS,
						displayDecimals: BTC_DECIMALS
					})} BTC will be applied.</span
				>{/if}
		</svelte:fragment>
	</ReceiveAddress>
{/if}

<button class="primary full center text-center mt-8 mb-6" on:click={modalStore.close}
	>{$i18n.core.text.done}</button
>
