<script lang="ts">
	import { sortedTransactionsStore } from '$lib/stores/transactions.store';
	import Transaction from '$lib/components/dashboard/Transaction.svelte';
</script>

{#each $sortedTransactionsStore as transaction, index (transaction.hash)}
	<Transaction {transaction} />
{/each}

{#if $sortedTransactionsStore.length === 0}
	<p class="mt-1 text-cetacean-blue opacity-50">You have no transactions yet.</p>
{/if}
