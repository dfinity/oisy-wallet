<script lang="ts">
	import { sortedTransactionsStore } from '$lib/stores/transactions.store';
	import Transaction from '$lib/components/dashboard/Transaction.svelte';
</script>

<p class="font-bold mb-3">Activity</p>

{#each $sortedTransactionsStore as transaction, index (transaction.hash)}
	<Transaction {transaction} />
{/each}
