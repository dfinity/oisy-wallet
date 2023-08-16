<script lang="ts">
	import { busy, isBusy } from '$lib/stores/busy.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import { signTransaction } from '$lib/api/backend.api';
	import {
		getFeeData,
		getTransactionCount,
		sendTransaction
	} from '$lib/providers/etherscan.providers';
	import { isNullish } from '@dfinity/utils';
	import { CHAIN_ID, ETH_BASE_FEE } from '$lib/constants/eth.constants';
	import { Utils } from 'alchemy-sdk';
	import { addressStore } from '$lib/stores/address.store';
	import IconSend from '$lib/components/icons/IconSend.svelte';
	import { balanceStoreEmpty } from '$lib/stores/balance.store';

	const send = async () => {
		busy.start();

		try {
			// https://github.com/ethers-io/ethers.js/discussions/2439#discussioncomment-1857403
			const { maxFeePerGas, maxPriorityFeePerGas } = await getFeeData();

			// https://docs.ethers.org/v5/api/providers/provider/#Provider-getFeeData
			// exceeds block gas limit
			if (isNullish(maxFeePerGas) || isNullish(maxPriorityFeePerGas)) {
				throw new Error('Cannot get max gas fee');
			}

			const nonce = await getTransactionCount($addressStore!);

			const transaction = {
				to: '0x6D1b7ceAd24FBaf153a3a18f09395Fd2f9C64912',
				value: Utils.parseEther('0.0001').toBigInt(),
				chain_id: CHAIN_ID,
				nonce: BigInt(nonce),
				gas: ETH_BASE_FEE,
				max_fee_per_gas: maxFeePerGas.toBigInt(),
				max_priority_fee_per_gas: maxPriorityFeePerGas.toBigInt()
			} as const;

			console.log(transaction);

			const rawTransaction = await signTransaction(transaction);

			console.log(rawTransaction);

			const sentTransaction = await sendTransaction(rawTransaction);

			console.log('Success', sentTransaction);
		} catch (err: unknown) {
			toastsError({
				msg: { text: `Something went wrong while sending the transaction.` },
				err
			});
		}

		busy.stop();
	};

	let disabled;
	$: disabled = $balanceStoreEmpty || $isBusy;
</script>

<button class="flex-1 secondary" on:click={send} {disabled} class:opacity-50={disabled}>
	<IconSend size="28" />
	<span>Send</span></button
>
