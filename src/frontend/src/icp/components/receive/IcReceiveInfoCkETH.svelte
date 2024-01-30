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
	import Value from '$lib/components/ui/Value.svelte';

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
		>Use this address to transfer ckETH to and from your wallet.
	</svelte:fragment>
</IcReceiveInfoBlock>

<div class="mb-6">
	<Hr />
</div>

<Value ref="ethereum-helper-contract" element="div">
	<svelte:fragment slot="label">Receive from Ethereum Network</svelte:fragment>

	<p class="text-misty-rose break-normal py-2">
		Converting ETH into ckETH requires a call to a smart contract on Ethereum and passing your IC
		principal as argument, in the form of a bytes32 array.
	</p>
</Value>

<button class="primary full center text-center mt-8 mb-6" on:click={modalStore.close}>Done</button>
