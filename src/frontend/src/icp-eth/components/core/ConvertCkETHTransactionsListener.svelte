<script lang="ts">
	import { fromNullable, isNullish, nonNullish } from '@dfinity/utils';
	import { onDestroy } from 'svelte';
	import type { WebSocketListener } from '$eth/types/listener';
	import type { OptionAddress } from '$lib/types/address';
	import { initPendingTransactionsListener as initEthPendingTransactionsListenerProvider } from '$eth/providers/alchemy.providers';
	import { ckEthHelperContractAddressStore } from '$icp-eth/stores/cketh.store';
	import { ETHEREUM_TOKEN_ID } from '$icp-eth/constants/tokens.constants';
	import { tokenId } from '$lib/derived/token.derived';
	import { address } from '$lib/derived/address.derived';
	import { convertEthToCkEthPendingStore } from '$icp/stores/cketh-transactions.store';
	import { balance } from '$lib/derived/balances.derived';
	import type { BigNumber } from '@ethersproject/bignumber';
	import { ckEthMinterInfoStore } from '$icp/stores/cketh.store';
	import { authStore } from '$lib/stores/auth.store';
	import {
		loadPendingCkEthTransaction,
		loadPendingCkEthTransactions
	} from '$icp-eth/services/eth.services';
	import { networkId } from '$lib/derived/network.derived';

	let listener: WebSocketListener | undefined = undefined;

	let loadBalance: BigNumber | undefined | null = undefined;

	// TODO: this is way too much work for a component and for the UI. Defer all that mumbo jumbo to a worker.

	const loadPendingTransactions = async ({ toAddress }: { toAddress: OptionAddress }) => {
		if (isNullish(toAddress)) {
			convertEthToCkEthPendingStore.reset($tokenId);
			return;
		}

		const lastObservedBlockNumber = fromNullable(
			$ckEthMinterInfoStore?.[$tokenId]?.data.last_observed_block_number ?? []
		);

		// The ckETH minter info has not yet been fetched. We require this information to query all transactions above a certain block index. These can be considered as pending, given that they have not yet been seen by the minter.
		if (isNullish(lastObservedBlockNumber)) {
			return;
		}

		// We keep track of what balance was used to fetch the pending transactions to avoid triggering unnecessary reload.
		// In addition, a transaction might be emitted by the socket (Alchemy) as pending but, might require a few extra time to be delivered as pending by the API (Ehterscan) which can lead to a "race condition" where a pending transaction is displayed and then hidden few seconds later.
		if (nonNullish(loadBalance) && nonNullish($balance) && loadBalance.eq($balance)) {
			return;
		}

		loadBalance = $balance;

		await loadPendingCkEthTransactions({
			tokenId: $tokenId,
			lastObservedBlockNumber,
			identity: $authStore.identity,
			toAddress,
			networkId: $networkId
		});
	};

	const init = async ({ toAddress }: { toAddress: OptionAddress }) => {
		await listener?.disconnect();

		if (isNullish(toAddress)) {
			return;
		}

		listener = initEthPendingTransactionsListenerProvider({
			toAddress,
			fromAddress: $address,
			listener: async (hash: string) =>
				await loadPendingCkEthTransaction({ hash, tokenId: $tokenId })
		});
	};

	let ckEthHelperContractAddress: string | undefined;
	$: ckEthHelperContractAddress = $ckEthHelperContractAddressStore?.[ETHEREUM_TOKEN_ID]?.data;

	$: (async () => init({ toAddress: ckEthHelperContractAddress }))();

	// Update pending transactions:
	// - When the balance updates, i.e., when new transactions are detected, it's possible that the pending ETH -> ckETH transactions have been minted.
	// - The scheduled minter info updates are important because we use the information it provides to query the Ethereum network starting from a specific block index.
	$: $balance,
		$ckEthMinterInfoStore,
		ckEthHelperContractAddress,
		(async () => await loadPendingTransactions({ toAddress: ckEthHelperContractAddress }))();

	onDestroy(async () => await listener?.disconnect());
</script>

<slot />
