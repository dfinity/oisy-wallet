<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onDestroy } from 'svelte';
	import type { WebSocketListener } from '$eth/types/listener';
	import type { OptionAddress } from '$lib/types/address';
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
	import { convertEthToCkEthPendingStore } from '$icp/stores/cketh-transactions.store';
	import { balance } from '$lib/derived/balances.derived';
	import type { BigNumber } from '@ethersproject/bignumber';

	let listener: WebSocketListener | undefined = undefined;

	let loadBalance: BigNumber | undefined | null = undefined;

	const loadPendingTransactions = async ({ toAddress }: { toAddress: OptionAddress }) => {
		if (isNullish(toAddress)) {
			convertEthToCkEthPendingStore.reset($tokenId);
			return;
		}

		// We keep track of what balance was used to fetch the pending transactions to avoid triggering unecessary reload.
		// In addition, a transaction might be emitted by the socket (Alchemy) as pending but, might require a few extra time to be delivered as pending by the API (Ehterscan) which can lead to a "race condition" where a pending transaction is displayed and then hidden few seconds later.
		if (nonNullish(loadBalance) && nonNullish($balance) && loadBalance.eq($balance)) {
			return;
		}

		loadBalance = $balance;

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
			data: pendingEthToCkEthTransactions.map((transaction) => ({
				data: mapCkETHPendingTransaction({ transaction }),
				certified: false
			}))
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

				convertEthToCkEthPendingStore.prepend({
					tokenId: $tokenId,
					transaction: {
						data: mapCkETHPendingTransaction({ transaction }),
						certified: false
					}
				});
			}
		});
	};

	let ckEthHelperContractAddress: string | undefined;
	$: ckEthHelperContractAddress = $ckEthHelperContractAddressStore?.[ETHEREUM_TOKEN_ID]?.data;

	$: (async () => init({ toAddress: ckEthHelperContractAddress }))();

	// When the balance updates - i.e. when new transactions are detected - it might be that the pending ETH -> ckETH transactions have been minted.
	$: $balance, (async () => loadPendingTransactions({ toAddress: ckEthHelperContractAddress }))();

	onDestroy(async () => await listener?.disconnect());
</script>

<slot />
