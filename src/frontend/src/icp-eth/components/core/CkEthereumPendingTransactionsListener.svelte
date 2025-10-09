<script lang="ts">
	import {
		isNullish,
		nonNullish,
		isEmptyString,
		fromNullishNullable,
		debounce
	} from '@dfinity/utils';
	import type { TransactionResponse } from 'ethers/providers';
	import { onDestroy } from 'svelte';
	import { initPendingTransactionsListener as initEthPendingTransactionsListenerProvider } from '$eth/providers/alchemy.providers';
	import { icPendingTransactionsStore } from '$icp/stores/ic-pending-transactions.store';
	import type { IcToken } from '$icp/types/ic-token';
	import { isIcCkToken } from '$icp/validation/ic-token.validation';
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
	import type { OptionEthAddress } from '$lib/types/address';
	import type { OptionBalance } from '$lib/types/balance';
	import type { WebSocketListener } from '$lib/types/listener';
	import type { OptionToken, Token } from '$lib/types/token';

	export let token: OptionToken;
	export let ckEthereumNativeToken: Token;

	let listener: WebSocketListener | undefined = undefined;

	let loadBalance: OptionBalance = undefined;

	let twinToken: Token | undefined;
	$: twinToken = nonNullish(token) && isIcCkToken(token) ? token.twinToken : undefined;

	let toContractAddress = '';
	$: toContractAddress =
		nonNullish(twinToken) && twinToken.standard === 'erc20'
			? (toCkErc20HelperContractAddress($ckEthMinterInfoStore?.[ckEthereumNativeToken.id]) ?? '')
			: (toCkEthHelperContractAddress($ckEthMinterInfoStore?.[ckEthereumNativeToken.id]) ?? '');

	// TODO: this is way too much work for a component and for the UI. Defer all that mumbo jumbo to a worker.
	const loadPendingTransactions = async () => {
		if (isNullish(token)) {
			return;
		}

		if (isNullish(toContractAddress)) {
			icPendingTransactionsStore.reset(token.id);
			return;
		}

		if (isNullish(twinToken)) {
			return;
		}

		const lastObservedBlockNumber = fromNullishNullable(
			$ckEthMinterInfoStore?.[ckEthereumNativeToken.id]?.data.last_observed_block_number
		);

		// The ckETH minter info has not yet been fetched. We require this information to query all transactions above a certain block index. These can be considered as pending, given that they have not yet been seen by the minter.
		if (isNullish(lastObservedBlockNumber)) {
			return;
		}

		// We keep track of what balance was used to fetch the pending transactions to avoid triggering unnecessary reload.
		// In addition, a transaction might be emitted by the socket (Alchemy) as pending but, might require a few extra time to be delivered as pending by the API (Ehterscan) which can lead to a "race condition" where a pending transaction is displayed and then hidden few seconds later.
		if (nonNullish(loadBalance) && nonNullish($balance) && loadBalance === $balance) {
			return;
		}

		loadBalance = $balance;

		await loadCkEthereumPendingTransactions({
			token: token as IcToken,
			lastObservedBlockNumber,
			identity: $authIdentity,
			toAddress: toContractAddress,
			twinToken
		});
	};

	let isDestroyed = false;

	const init = async ({
		toAddress,
		twinToken
	}: {
		toAddress: OptionEthAddress;
		twinToken: OptionToken;
	}) => {
		await listener?.disconnect();

		// There could be a race condition where the component is destroyed before the listener is connected.
		// However, the flow still connects the listener and updates the UI.
		if (isDestroyed) {
			return;
		}

		if (isNullish(toAddress) || isEmptyString(toAddress)) {
			return;
		}

		if (isNullish(twinToken)) {
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
					token: token as IcToken,
					twinToken,
					networkId: twinToken.network.id
				});
			},
			networkId: twinToken.network.id
		});
	};

	$: (async () => await init({ toAddress: toContractAddress, twinToken }))();

	const debounceLoadPendingTransactions = debounce(loadPendingTransactions, 1000);

	// Update pending transactions:
	// - When the balance updates, i.e., when new transactions are detected, it's possible that the pending ETH -> ckETH transactions have been minted.
	// - The scheduled minter info updates are important because we use the information it provides to query the Ethereum network starting from a specific block index.
	$: ($balance, toContractAddress, debounceLoadPendingTransactions());

	onDestroy(async () => {
		isDestroyed = true;
		await listener?.disconnect();
		listener = undefined;
	});
</script>

<slot />
