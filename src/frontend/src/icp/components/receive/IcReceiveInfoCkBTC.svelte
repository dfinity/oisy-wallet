<script lang="ts">
	import { icrcAccountIdentifierText } from '$icp/derived/ic.derived';
	import { modalStore } from '$lib/stores/modal.store';
	import Hr from '$lib/components/ui/Hr.svelte';
	import { createEventDispatcher } from 'svelte';
	import IcReceiveInfoBlock from '$icp/components/receive/IcReceiveInfoBlock.svelte';
	import { btcAddressStore, ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
	import { tokenId } from '$lib/derived/token.derived';
	import { nonNullish } from '@dfinity/utils';
	import { BTC_DECIMALS } from '$icp/constants/ckbtc.constants';
	import { formatToken } from '$lib/utils/format.utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import { fade } from 'svelte/transition';

	const dispatch = createEventDispatcher();

	const displayQRCode = (addressType: string) => dispatch('icQRCode', addressType);

	let btcAddress: string | undefined = undefined;
	$: btcAddress = $btcAddressStore?.[$tokenId]?.data;

	let kytFee: bigint | undefined = undefined;
	$: kytFee = $ckBtcMinterInfoStore?.[$tokenId]?.data.kyt_fee;
</script>

<IcReceiveInfoBlock
	labelRef="wallet-address"
	address={$icrcAccountIdentifierText ?? ''}
	qrCodeAriaLabel="Display wallet address as a QR code"
	copyAriaLabel="Wallet address copied to clipboard."
	on:click={() => displayQRCode($icrcAccountIdentifierText ?? '')}
>
	<svelte:fragment slot="title">Wallet address</svelte:fragment>
	<svelte:fragment slot="text"
		>Use this address to transfer ckBTC to and from your wallet.
	</svelte:fragment>
</IcReceiveInfoBlock>

{#if nonNullish(btcAddress)}
	<div class="mb-6">
		<Hr />
	</div>

	<IcReceiveInfoBlock
		labelRef="bitcoin-address"
		address={btcAddress}
		qrCodeAriaLabel="Display Bitcoin Address as a QR code"
		copyAriaLabel="Bitcoin Address copied to clipboard."
		on:click={() => displayQRCode(btcAddress ?? '')}
	>
		<svelte:fragment slot="title">Bitcoin Address</svelte:fragment>
		<svelte:fragment slot="text"
			>"Transfer Bitcoin on the BTC network to this address to receive ckBTC. {#if nonNullish(kytFee)}<span
					in:fade
					>Please note that an estimated inter-network fee of {formatToken({
						value: BigNumber.from(kytFee),
						unitName: BTC_DECIMALS,
						displayDecimals: BTC_DECIMALS
					})} BTC will be applied.</span
				>{/if}
		</svelte:fragment>
	</IcReceiveInfoBlock>
{/if}

<button class="primary full center text-center mt-8 mb-6" on:click={modalStore.close}>Done</button>
