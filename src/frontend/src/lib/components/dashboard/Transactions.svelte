<script lang="ts">
	import Transaction from '$lib/components/dashboard/Transaction.svelte';
	import { sortedTransactions } from '$lib/derived/transactions.derived';
</script>

{#each $sortedTransactions as transaction, index (transaction.hash)}
	<Transaction {transaction} />
{/each}

{#if $sortedTransactions.length === 0}
	<p class="mt-1 text-cetacean-blue opacity-50">You have no transactions yet.</p>
{/if}
