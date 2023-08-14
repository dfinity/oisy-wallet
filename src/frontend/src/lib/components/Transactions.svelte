<script lang="ts">
	import { onMount } from 'svelte';
	import { transactions as transactionsService } from '$lib/services/provider.services';
	import type { TransactionResponse } from '@ethersproject/providers';
	import { utils } from 'ethers';
	import { ethAddressStore } from '$lib/stores/eth.store';
	import { pendingTransactionsStore } from '$lib/stores/transactions.store';

	let transactions: TransactionResponse[] = [];

	onMount(async () => {
		// TODO: error
		// TODO: watcher?
		transactions = await transactionsService($ethAddressStore!);
	});
</script>

{#each transactions as { from, to, value, blockNumber }, index (blockNumber)}
	<hr />
	<p>From: <output>{from}</output></p>
	<p>To: <output>{to}</output></p>
	<p>Value: <output>{utils.formatEther(value.toString())}</output></p>
{/each}

{#each $pendingTransactionsStore as { from, to, value, blockNumber }, index (blockNumber)}
	<hr />
	<p>From: <output>{from}</output></p>
	<p>To: <output>{to}</output></p>
	<p>Value: <output>{utils.formatEther(value.toString())}</output></p>
	<p><strong>Pending</strong></p>
{/each}

<style lang="scss">
	hr {
		width: 100%;
		border: 1px solid lightseagreen;
	}
</style>
