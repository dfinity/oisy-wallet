<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { onDestroy } from 'svelte';
	import type { WebSocketListener } from '$eth/types/listener';
	import type { ETH_ADDRESS, OptionAddress } from '$lib/types/address';
	import { initPendingTransactionsListener as initEthPendingTransactionsListenerProvider } from '$eth/providers/alchemy.providers';
	import { transactions as transactionsProviders } from '$eth/providers/etherscan.providers';
	import { isTransactionPending } from '$eth/utils/transactions.utils';
	import { getBlockNumber } from '$eth/providers/infura.providers';
	import { ckEthHelperContractAddressStore } from '$icp-eth/stores/cketh.store';
	import { ETHEREUM_TOKEN_ID } from '$lib/constants/tokens.constants';
	import { processEthTransaction } from '$eth/services/transaction.services';

	let listener: WebSocketListener | undefined = undefined;

	const loadPendingTransactions = async ({ address }: { address: ETH_ADDRESS }) => {
		const currentBlockNumber = await getBlockNumber();
		const transactions = await transactionsProviders(address);

		const pendingEthToCkEthTransactions = transactions.filter((t) => {
			if (isTransactionPending(t)) {
				return true;
			}

			const diff = currentBlockNumber - (t.blockNumber ?? 0);
			return diff < 64;
		});

		// TODO: add to ic-transaction store?
		console.log('Pending transactions', pendingEthToCkEthTransactions);
	};

	const init = async ({ address }: { address: OptionAddress }) => {
		await listener?.disconnect();

		if (isNullish(address)) {
			return;
		}

		await loadPendingTransactions({ address });

		listener = initEthPendingTransactionsListenerProvider({
			address,
			listener: async (hash: string) => {
				const transaction = await processEthTransaction({ hash });

				// TODO: add to ic-transaction store?
				console.log('PENDING', transaction);
			}
		});
	};

	let ckEthHelperContractAddress: string | undefined;
	$: ckEthHelperContractAddress = $ckEthHelperContractAddressStore?.[ETHEREUM_TOKEN_ID]?.data;

	$: (async () => init({ address: ckEthHelperContractAddress }))();

	onDestroy(async () => await listener?.disconnect());
</script>

<slot />
