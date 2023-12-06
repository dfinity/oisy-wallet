<script lang="ts">
	import Transaction from '$lib/components/transactions/Transaction.svelte';
	import { sortedTransactions } from '$lib/derived/transactions.derived';
	import { loadTransactions } from '$lib/services/transactions.services';
	import type { TokenId } from '$lib/types/token';
	import { onMount } from 'svelte';
	import { tokenId } from '$lib/derived/token.derived';
	import { AIRDROP } from '$lib/constants/airdrop.constants';
	import { modalTransaction } from '$lib/derived/modal.derived';
	import TransactionModal from '$lib/components/transactions/TransactionModal.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import { nonNullish } from '@dfinity/utils';
	import type { Transaction as TransactionType } from '$lib/types/transaction';
	import TransactionsSkeletons from '$lib/components/transactions/TransactionsSkeletons.svelte';

	const load = async (tokenId: TokenId) => await loadTransactions(tokenId);

	onMount(async () => await load($tokenId));

	let selectedTransaction: TransactionType | undefined;
	$: selectedTransaction = $modalTransaction
		? ($modalStore?.data as TransactionType | undefined)
		: undefined;
</script>

<h2 class="text-base mb-6 pb-1" class:mt-12={AIRDROP} class:mt-16={!AIRDROP}>Transactions</h2>

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
