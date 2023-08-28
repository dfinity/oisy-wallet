<script lang="ts">
	import { sortedTransactionsStore } from '$lib/stores/transactions.store';
	import Transaction from '$lib/components/dashboard/Transaction.svelte';
</script>

<div
	class="font-bold flex"
	class:mb-4={$sortedTransactionsStore.length > 0}
	style="border-bottom: 1px solid var(--color-deep-violet)"
>
	<button class="flex-1 tab" style="border-bottom: 3px solid var(--color-deep-violet)">Tokens</button>
	<button class="flex-1 tab" style="border-bottom: 3px solid transparent">Activity</button>
</div>

{#each $sortedTransactionsStore as transaction, index (transaction.hash)}
	<Transaction {transaction} />
{/each}

{#if $sortedTransactionsStore.length === 0}
	<p class="mt-1 text-cetacean-blue opacity-50">You have no transactions yet.</p>
{/if}
