<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { onDestroy } from 'svelte';
	import type { WebSocketListener } from '$eth/types/listener';
	import type { ETH_ADDRESS, OptionAddress } from '$lib/types/address';
	import {
		getTransaction,
		initPendingTransactionsListener as initEthPendingTransactionsListenerProvider
	} from '$eth/providers/alchemy.providers';
	import { transactions as transactionsProviders } from '$eth/providers/etherscan.providers';
	import { isTransactionPending } from '$eth/utils/transactions.utils';
	import { getBlockNumber } from '$eth/providers/infura.providers';
	import { ckEthHelperContractAddressStore } from '$icp-eth/stores/cketh.store';
	import { ETHEREUM_TOKEN_ID } from '$lib/constants/tokens.constants';
	import { mapCkETHPendingTransaction } from '$icp-eth/utils/cketh-transactions.utils';
	import { tokenId } from '$lib/derived/token.derived';
	import { toastsError } from '$lib/stores/toasts.store';
	import { address } from '$lib/derived/address.derived';
    import {convertEthToCkEthPendingStore} from "$icp/stores/cketh-transactions.store";

	let listener: WebSocketListener | undefined = undefined;

	const loadPendingTransactions = async ({ toAddress }: { toAddress: ETH_ADDRESS }) => {
		const currentBlockNumber = await getBlockNumber();
		const transactions = await transactionsProviders(toAddress);

		const pendingEthToCkEthTransactions = transactions.filter((tx) => {
			// Pending transactions for this Oisy Wallet address - i.e. if from address is different, it is not a pending address?
			if (isNullish($address) || tx.from.toLowerCase() !== $address.toLowerCase()) {
				return false;
			}

			if (isTransactionPending(tx)) {
				return true;
			}

			const diff = currentBlockNumber - (tx.blockNumber ?? 0);
			return diff < 64;
		});

		convertEthToCkEthPendingStore.set({
			tokenId: $tokenId,
			data: {
				data: pendingEthToCkEthTransactions.map((transaction) =>
					mapCkETHPendingTransaction({ transaction })
				),
				certified: false
			}
		});
	};

	const init = async ({ toAddress }: { toAddress: OptionAddress }) => {
		await listener?.disconnect();

		if (isNullish(toAddress)) {
			return;
		}

		await loadPendingTransactions({ toAddress });

		listener = initEthPendingTransactionsListenerProvider({
			toAddress,
			fromAddress: $address,
			listener: async (hash: string) => {
				const transaction = await getTransaction(hash);

				if (isNullish(transaction)) {
					toastsError({
						msg: {
							text: `Failed to get the transaction from the provided (hash: ${hash}). Please reload the wallet dapp.`
						}
					});
					return;
				}

				// TODO: add to ic-transaction store?
				console.log('PENDING', transaction);
			}
		});
	};

	let ckEthHelperContractAddress: string | undefined;
	$: ckEthHelperContractAddress = $ckEthHelperContractAddressStore?.[ETHEREUM_TOKEN_ID]?.data;

	$: (async () => init({ toAddress: ckEthHelperContractAddress }))();

	// TODO: reload when ICRC worker transactions kicks

	onDestroy(async () => await listener?.disconnect());
</script>

<slot />
