<script lang="ts">
	import { fromNullable, isNullish, nonNullish, isEmptyString } from '@dfinity/utils';
	import type { TransactionResponse } from '@ethersproject/abstract-provider';
	import { onDestroy } from 'svelte';
	import { initPendingTransactionsListener as initEthPendingTransactionsListenerProvider } from '$eth/providers/alchemy.providers';
	import { tokenAsIcToken } from '$icp/derived/ic-token.derived';
	import { icPendingTransactionsStore } from '$icp/stores/ic-pending-transactions.store';
	import {
		ckEthereumNativeToken,
		ckEthereumNativeTokenId,
		ckEthereumTwinToken,
		ckEthereumTwinTokenStandard
	} from '$icp-eth/derived/cketh.derived';
	import {
		loadPendingCkEthereumTransaction,
		loadCkEthereumPendingTransactions
	} from '$icp-eth/services/eth.services';
	import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
	import {
		toCkErc20HelperContractAddress,
		toCkEthHelperContractAddress
	} from '$icp-eth/utils/cketh.utils';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { balance } from '$lib/derived/balances.derived';
	import { tokenId } from '$lib/derived/token.derived';
	import { token } from '$lib/stores/token.store';
	import type { OptionEthAddress } from '$lib/types/address';
	import type { OptionBalance } from '$lib/types/balance';
	import type { WebSocketListener } from '$lib/types/listener';
	import type { NetworkId } from '$lib/types/network';

	let listener: WebSocketListener | undefined = undefined;

	let loadBalance: OptionBalance = undefined;

	// TODO: this is way too much work for a component and for the UI. Defer all that mumbo jumbo to a worker.

	const loadPendingTransactions = async ({ toAddress }: { toAddress: OptionEthAddress }) => {
		if (isNullish($tokenId) || isNullish($token)) {
			return;
		}

		if (isNullish(toAddress)) {
			icPendingTransactionsStore.reset($tokenId);
			return;
		}

		if (isNullish($ckEthereumTwinToken)) {
			return;
		}

		const lastObservedBlockNumber = fromNullable(
			$ckEthMinterInfoStore?.[$ckEthereumNativeTokenId]?.data.last_observed_block_number ?? []
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

		await loadCkEthereumPendingTransactions({
			token: $tokenAsIcToken,
			lastObservedBlockNumber,
			identity: $authIdentity,
			toAddress,
			twinToken: $ckEthereumTwinToken
		});
	};

	const init = async ({
		toAddress,
		networkId
	}: {
		toAddress: OptionEthAddress;
		networkId: NetworkId | undefined;
	}) => {
		await listener?.disconnect();

		if (isNullish(toAddress) || isEmptyString(toAddress)) {
			return;
		}

		if (isNullish(networkId)) {
			return;
		}

		if (isNullish($ethAddress)) {
			return;
		}

		listener = initEthPendingTransactionsListenerProvider({
			toAddress,
			listener: async ({ hash, from }: TransactionResponse) => {
				// Filtering from and to with Alchemy (see initEthPendingTransactionsListenerProvider) at the same time does not work according our observations.
				// Therefore, we are observing the `to` address and filtering the `from` on each event.
				if ($ethAddress?.toLowerCase() !== from.toLowerCase()) {
					return;
				}

				await loadPendingCkEthereumTransaction({
					hash,
					token: $tokenAsIcToken,
					twinToken: $ckEthereumTwinToken,
					networkId
				});
			},
			networkId
		});
	};

	let toContractAddress = '';
	$: toContractAddress =
		$ckEthereumTwinTokenStandard === 'erc20'
			? (toCkErc20HelperContractAddress($ckEthMinterInfoStore?.[$ckEthereumNativeTokenId]) ?? '')
			: (toCkEthHelperContractAddress({
					minterInfo: $ckEthMinterInfoStore?.[$ckEthereumNativeTokenId],
					networkId: $ckEthereumNativeToken.network.id
				}) ?? '');

	$: (async () =>
		await init({ toAddress: toContractAddress, networkId: $ckEthereumTwinToken?.network.id }))();

	// Update pending transactions:
	// - When the balance updates, i.e., when new transactions are detected, it's possible that the pending ETH -> ckETH transactions have been minted.
	// - The scheduled minter info updates are important because we use the information it provides to query the Ethereum network starting from a specific block index.
	$: $balance,
		$ckEthMinterInfoStore,
		$ckEthereumTwinToken,
		toContractAddress,
		(async () => await loadPendingTransactions({ toAddress: toContractAddress }))();

	onDestroy(async () => await listener?.disconnect());
</script>

<slot />
