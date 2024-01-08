<script lang="ts">
	import Transaction from './Transaction.svelte';
	import { sortedTransactions } from '$lib/derived/transactions.derived';
	import { loadTransactions } from '../../services/transactions.services';
	import type { Token } from '$lib/types/token';
	import { onMount } from 'svelte';
	import { token } from '$lib/derived/token.derived';
	import { modalTransaction } from '$lib/derived/modal.derived';
	import TransactionModal from './TransactionModal.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import { nonNullish } from '@dfinity/utils';
	import type { Transaction as TransactionType } from '$lib/types/transaction';
	import TransactionsSkeletons from './TransactionsSkeletons.svelte';
	import { isNetworkIdEthereum } from '$lib/utils/network.utils';

	const load = async ({ network: { id: networkId }, id: tokenId }: Token) => {
		// If user browser ICP transactions but switch token to Eth, due to the derived stores, the token can briefly be set to ICP while the navigation is not over.
		// This prevents the glitch load of ETH transaction with a token ID for ICP.
		if (!isNetworkIdEthereum(networkId)) {
			return;
		}

		await loadTransactions(tokenId);
	};

	onMount(async () => await load($token));

	let selectedTransaction: TransactionType | undefined;
	$: selectedTransaction = $modalTransaction
		? ($modalStore?.data as TransactionType | undefined)
		: undefined;
</script>

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
