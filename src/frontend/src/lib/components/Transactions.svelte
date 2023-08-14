<script lang="ts">
	import { onMount } from 'svelte';
	import { utils } from 'ethers';
	import { ethAddressStore } from '$lib/stores/eth.store';
	import { transactionsStore } from '$lib/stores/transactions.store';
	import { isTransactionPending } from '$lib/utils/transactions.utils';
	import { loadTransactions } from '$lib/services/transactions.services';

	onMount(async () => await loadTransactions({ address: $ethAddressStore! }));
</script>

{#each $transactionsStore as transaction, index (transaction.hash)}
	{@const { from, to, value } = transaction}

	<hr />
	<p>From: <output>{from}</output></p>
	<p>To: <output>{to}</output></p>
	<p>Value: <output>{utils.formatEther(value.toString())}</output></p>

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
