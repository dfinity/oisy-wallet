<script lang="ts">
	import Transaction from '$lib/components/dashboard/Transaction.svelte';
	import { sortedTransactions } from '$lib/derived/transactions.derived';
	import { loadTransactions } from '$lib/services/transactions.services';
	import type { TokenId } from '$lib/types/token';
	import { tokenIdStore } from '$lib/stores/token-id.stores';
	import { onMount } from 'svelte';

	let loading = true;

	const load = async (tokenId: TokenId) => await loadTransactions(tokenId);

	onMount(async () => {
		await load($tokenIdStore);

		loading = false;
	});
</script>

{#if loading}
	<p class="mt-1 text-dark opacity-50">Loading...</p>
{:else}
	{#each $sortedTransactions as transaction, _index (transaction.hash)}
		<Transaction {transaction} />
	{/each}

	{#if $sortedTransactions.length === 0}
		<p class="mt-1 text-dark opacity-50">You have no transactions yet.</p>
	{/if}
{/if}
