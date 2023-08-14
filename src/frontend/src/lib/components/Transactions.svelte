<script lang="ts">
	import { onMount } from 'svelte';
	import { addressStore } from '$lib/stores/address.store';
	import { sortedTransactionsStore } from '$lib/stores/transactions.store';
	import { isTransactionPending } from '$lib/utils/transactions.utils';
	import { loadTransactions } from '$lib/services/transactions.services';
	import { Utils } from 'alchemy-sdk';

	onMount(async () => await loadTransactions({ address: $addressStore! }));
</script>

{#each $sortedTransactionsStore as transaction, index (transaction.hash)}
	{@const { blockNumber, from, to, value } = transaction}

	<hr />
	<p>Block: <output>{blockNumber ?? ''}</output></p>
	<p>From: <output>{from}</output></p>
	<p>To: <output>{to}</output></p>
	<p>Value: <output>{Utils.formatEther(value.toString())}</output></p>

	{#if isTransactionPending(transaction)}
		<p><strong>Pending</strong></p>
	{/if}
{/each}

<style lang="scss">
	hr {
		width: 100%;
		border: 1px solid lightseagreen;
	}
</style>
