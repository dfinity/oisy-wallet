<script lang="ts">
	import { busy } from '$lib/stores/busy.store';
	import { toasts } from '$lib/stores/toasts.store';
	import { signTransaction } from '$lib/api/backend.api';
	import { getFeeData, sendTransaction } from '$lib/providers/etherscan.providers';
	import { isNullish } from '@dfinity/utils';
	import { parseEther } from 'ethers';
    import { ETH_BASE_FEE } from '$lib/constants/eth.constants';

	const send = async () => {
		busy.show();

		// Chain ID:
		// https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md
		// Sepolia: 11155111

		try {
			// https://github.com/ethers-io/ethers.js/discussions/2439#discussioncomment-1857403
			const { maxFeePerGas, maxPriorityFeePerGas } = await getFeeData();

			// https://docs.ethers.org/v5/api/providers/provider/#Provider-getFeeData
			// exceeds block gas limit
			if (isNullish(maxFeePerGas) || isNullish(maxPriorityFeePerGas)) {
				throw new Error('Cannot get max gas fee');
			}

			const transaction = {
				to: '0x6D1b7ceAd24FBaf153a3a18f09395Fd2f9C64912',
				value: parseEther('0.0001'),
				chain_id: 11155111n,
				nonce: 1n,
				gas: ETH_BASE_FEE,
				max_fee_per_gas: maxFeePerGas,
				max_priority_fee_per_gas: maxPriorityFeePerGas
			} as const;

			console.log(transaction);

			const rawTransaction = await signTransaction(transaction);

			console.log(rawTransaction);

			const sentTransaction = await sendTransaction(rawTransaction);

			console.log('Success', sentTransaction);

			await sentTransaction.wait();

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
