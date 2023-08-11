<script lang="ts">
	import { busy } from '$lib/stores/busy.store';
	import { toasts } from '$lib/stores/toasts.store';
	import { signTransaction } from '$lib/api/backend.api';
	import { parseEther } from 'ethers/lib/utils';
	import { getFeeData, sendTransaction } from '$lib/services/provider.services';
	import { isNullish } from '@dfinity/utils';

	const send = async () => {
		busy.show();

		// Chain ID:
		// https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md
		// Sepolia: 11155111

		try {
			// https://github.com/ethers-io/ethers.js/discussions/2439#discussioncomment-1857403
			const { gasPrice, maxFeePerGas, maxPriorityFeePerGas } = await getFeeData();

			if (isNullish(gasPrice) || isNullish(maxFeePerGas) || isNullish(maxPriorityFeePerGas)) {
				throw new Error('Cannot get gas fee');
			}

            const transaction = {
                to: '0x6D1b7ceAd24FBaf153a3a18f09395Fd2f9C64912',
                value: parseEther('0.0001').toBigInt(),
                chain_id: 11155111n,
                nonce: 1n,
                gas: gasPrice.toBigInt(),
                max_fee_per_gas: maxFeePerGas.toBigInt(),
                max_priority_fee_per_gas: maxPriorityFeePerGas.toBigInt()
            } as const;

            console.log(transaction);

			const rawTransaction = await signTransaction(transaction);

			console.log(rawTransaction);

			const result = await sendTransaction(rawTransaction);

			console.log('Success', result);

			const { wait } = result;

			await wait();

			console.log('Transaction mined.');
		} catch (err: unknown) {
            console.error(err);

			toasts.error({
				text: `Something went wrong while sending the transaction.`,
				detail: err
			});
		}

		busy.stop();
	};
</script>

<hr />
<button on:click={send}>Send</button>
