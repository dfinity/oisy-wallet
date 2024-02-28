<script lang="ts">
	import Transaction from './Transaction.svelte';
	import { sortedTransactions } from '$eth/derived/transactions.derived';
	import { loadTransactions } from '$eth/services/transactions.services';
	import type { Token } from '$lib/types/token';
	import { onMount } from 'svelte';
	import { token } from '$lib/derived/token.derived';
	import { modalTransaction } from '$lib/derived/modal.derived';
	import TransactionModal from './TransactionModal.svelte';
	import { modalStore } from '$lib/stores/modal.store';
	import {isNullish, nonNullish} from '@dfinity/utils';
	import type { Transaction as TransactionType } from '$lib/types/transaction';
	import TransactionsSkeletons from './TransactionsSkeletons.svelte';
	import { isNetworkIdEthereum } from '$lib/utils/network.utils';
	import { InfiniteScroll } from '@dfinity/gix-components';
	import {last} from "$lib/utils/array.utils";
	import {icTransactions} from "$icp/derived/ic-transactions.derived";

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

	let disableInfiniteScroll = false;

	const onIntersect = async () => {
		const lastBlockNumber = last($sortedTransactions)?.blockNumber;

		if (isNullish(lastBlockNumber)) {
			// No transactions yet or only pending transactions.
			return;
		}

		
	}
</script>

<h2 class="text-base mb-6 pb-1">Transactions</h2>

<TransactionsSkeletons>
	{#if $sortedTransactions.length > 0}
		<InfiniteScroll on:nnsIntersect={onIntersect} disabled={disableInfiniteScroll}>
			{#each $sortedTransactions as transaction, index (`${transaction.hash}-${index}`)}
				<li>
					<Transaction {transaction} />
				</li>
			{/each}
		</InfiniteScroll>
	{/if}

	{#if $sortedTransactions.length === 0}
		<p class="mt-4 text-dark opacity-50">You have no transactions.</p>
	{/if}
</TransactionsSkeletons>

{#if $modalTransaction && nonNullish(selectedTransaction)}
	<TransactionModal transaction={selectedTransaction} />
{/if}
