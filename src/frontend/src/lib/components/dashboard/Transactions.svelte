<script lang="ts">
	import Transaction from '$lib/components/dashboard/Transaction.svelte';
	import { sortedTransactions } from '$lib/derived/transactions.derived';
	import { loadTransactions } from '$lib/services/transactions.services';
	import type { TokenId } from '$lib/types/token';
	import { onMount } from 'svelte';
	import { tokenId } from '$lib/derived/token.derived';

	let loading = true;

	const load = async (tokenId: TokenId) => await loadTransactions(tokenId);

	onMount(async () => {
		await load($tokenId);

		loading = false;
	});
</script>

<h2 class="text-base mb-3 pb-0.5">Transactions</h2>

{#if loading}
	<p class="mt-1 text-cetacean-blue opacity-50">Transactions will appear here. Loading...</p>
{:else}
	{#each $sortedTransactions as transaction, _index (transaction.hash)}
		<Transaction {transaction} />
	{/each}

	{#if $sortedTransactions.length === 0}
		<p class="mt-1 text-cetacean-blue opacity-50">You have no transactions yet.</p>
	{/if}
{/if}
