<script lang="ts">
	import { icpTransactionsStore } from '$lib/stores/icp-transactions.store';
	import type { TransactionWithId } from '@dfinity/ledger-icp';
	import { ICP_TOKEN_ID } from '$lib/constants/tokens.constants';
	import IcpTransactionsSkeletons from '$lib/components/transactions/icp/IcpTransactionsSkeletons.svelte';

	let transactions: TransactionWithId[];
	$: transactions = $icpTransactionsStore[ICP_TOKEN_ID] ?? [];
</script>

<IcpTransactionsSkeletons>
	{#each transactions as transaction, index (`${transaction.id}-${index}`)}
		{transaction.id}
	{/each}

	{#if transactions.length === 0}
		<p class="mt-4 text-dark opacity-50">You have no transactions.</p>
	{/if}
</IcpTransactionsSkeletons>
