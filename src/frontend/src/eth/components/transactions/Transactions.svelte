<script lang="ts">
	import Transaction from './Transaction.svelte';
	import { sortedTransactions } from '$eth/derived/transactions.derived';
	import { loadTransactions } from '$eth/services/transactions.services';
	import type { TokenId } from '$lib/types/token';
	import { token } from '$lib/derived/token.derived';
	import { modalTransaction } from '$lib/derived/modal.derived';
	import TransactionModal from './TransactionModal.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import { nonNullish } from '@dfinity/utils';
	import type { Transaction as TransactionType } from '$lib/types/transaction';
	import TransactionsSkeletons from './TransactionsSkeletons.svelte';
	import { isNetworkIdEthereum } from '$lib/utils/network.utils';
	import { tokenNotInitialized } from '$eth/derived/nav.derived';

	let tokenIdLoaded: TokenId | undefined = undefined;

	const load = async () => {
		if ($tokenNotInitialized) {
			tokenIdLoaded = undefined;
			return;
		}

		const {
			network: { id: networkId },
			id: tokenId
		} = $token;

		// If user browser ICP transactions but switch token to Eth, due to the derived stores, the token can briefly be set to ICP while the navigation is not over.
		// This prevents the glitch load of ETH transaction with a token ID for ICP.
		if (!isNetworkIdEthereum(networkId)) {
			tokenIdLoaded = undefined;
			return;
		}

		// We don't reload the same token in a row.
		if (tokenIdLoaded === tokenId) {
			return;
		}

		tokenIdLoaded = tokenId;

		const { success } = await loadTransactions({ tokenId, networkId });

		if (!success) {
			tokenIdLoaded = undefined;
		}
	};

	$: $token, $tokenNotInitialized, (async () => await load())();

	let selectedTransaction: TransactionType | undefined;
	$: selectedTransaction = $modalTransaction
		? ($modalStore?.data as TransactionType | undefined)
		: undefined;
</script>

<h2 class="text-base mb-6 pb-1">Transactions</h2>

<TransactionsSkeletons>
	{#each $sortedTransactions as transaction, index (`${transaction.hash}-${index}`)}
		<Transaction {transaction} />
	{/each}

	{#if $sortedTransactions.length === 0}
		<p class="mt-4 text-dark opacity-50">You have no transactions.</p>
	{/if}
</TransactionsSkeletons>

{#if $modalTransaction && nonNullish(selectedTransaction)}
	<TransactionModal transaction={selectedTransaction} />
{/if}
