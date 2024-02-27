<script lang="ts">
	import { fromNullable, isNullish, nonNullish } from '@dfinity/utils';
	import { onDestroy } from 'svelte';
	import type { WebSocketListener } from '$eth/types/listener';
	import type { OptionAddress } from '$lib/types/address';
	import {
		getTransaction,
		initPendingTransactionsListener as initEthPendingTransactionsListenerProvider
	} from '$eth/providers/alchemy.providers';
	import { transactions as transactionsProviders } from '$eth/providers/etherscan.providers';
	import { ckEthHelperContractAddressStore } from '$icp-eth/stores/cketh.store';
	import { ETHEREUM_TOKEN_ID } from '$lib/constants/tokens.constants';
	import { mapCkETHPendingTransaction } from '$icp-eth/utils/cketh-transactions.utils';
	import { tokenId } from '$lib/derived/token.derived';
	import { toastsError } from '$lib/stores/toasts.store';
	import { address } from '$lib/derived/address.derived';
	import { convertEthToCkEthPendingStore } from '$icp/stores/cketh-transactions.store';
	import { balance } from '$lib/derived/balances.derived';
	import type { BigNumber } from '@ethersproject/bignumber';
	import { ckEthMinterInfoStore } from '$icp/stores/cketh.store';
	import { authStore } from '$lib/stores/auth.store';
	import { encodePrincipalToEthAddress } from '@dfinity/cketh';
	import { populateDepositTransaction } from '$eth/providers/infura-cketh.providers';
	import { warnSignOut } from '$lib/services/auth.services';

	let listener: WebSocketListener | undefined = undefined;

	let loadBalance: BigNumber | undefined | null = undefined;

	// TODO: this is way too much work for a component and for the UI. Defer all that mumbo jumbo to a worker.

	const loadPendingTransactions = async ({ toAddress }: { toAddress: OptionAddress }) => {
		if (isNullish($authStore.identity)) {
			await warnSignOut('You are not signed in. Please sign in to continue.');
			return;
		}

		if (isNullish(toAddress)) {
			convertEthToCkEthPendingStore.reset($tokenId);
			return;
		}

		const lastObservedBlockNumber = fromNullable(
			$ckEthMinterInfoStore?.[$tokenId]?.data.last_observed_block_number ?? []
		);

		// The ckETH minter info have not yet been fetched. We require those to query all transactions above a block index. Those can be considered as pending given that they have not yet been seen by the minter.
		if (isNullish(lastObservedBlockNumber)) {
			return;
		}

		// We keep track of what balance was used to fetch the pending transactions to avoid triggering unnecessary reload.
		// In addition, a transaction might be emitted by the socket (Alchemy) as pending but, might require a few extra time to be delivered as pending by the API (Ehterscan) which can lead to a "race condition" where a pending transaction is displayed and then hidden few seconds later.
		if (nonNullish(loadBalance) && nonNullish($balance) && loadBalance.eq($balance)) {
			return;
		}

		loadBalance = $balance;

		const transactions = await transactionsProviders({
			address: toAddress,
			startBlock: `${lastObservedBlockNumber}`
		});

		// We compute the data of a transfer of ETH to the ckETH helper contract with the principal of the user.
		// That way, we can use the data to compare the pending transaction of the contract to filter those that targets this user.
		const { data } = await populateDepositTransaction({
			contract: { address: toAddress },
			to: encodePrincipalToEthAddress($authStore.identity.getPrincipal())
		});

		const pendingEthToCkEthTransactions = transactions.filter(
			({ data: txData }) => txData === data
		);

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

	// Update pending transactions:
	// - When the balance updates - i.e. when new transactions are detected - it might be that the pending ETH -> ckETH transactions have been minted.
	// - When the scheduled minter info are updated given that we use the information it provides to query the Ethereum network from above a particular block index.
	$: $balance,
		$ckEthMinterInfoStore,
		(async () => await loadPendingTransactions({ toAddress: ckEthHelperContractAddress }))();

	onDestroy(async () => await listener?.disconnect());
</script>

<slot />
