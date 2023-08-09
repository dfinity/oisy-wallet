<script lang="ts">
	import { onMount } from 'svelte';
	import { transactions as transactionsService } from '$lib/services/provider.services';
	import type { TransactionResponse } from '@ethersproject/providers';
	import { utils } from 'ethers';

	let transactions: TransactionResponse[] = [];

	onMount(async () => {
		// TODO: error
		// TODO: watcher?
		transactions = await transactionsService('0x6D1b7ceAd24FBaf153a3a18f09395Fd2f9C64912');
	});
</script>

{#each transactions as { from, to, value, blockNumber }}
	<hr />
	<p>From: <output>{from}</output></p>
	<p>To: <output>{to}</output></p>
	<p>Value: <output>{utils.formatEther(value.toString())}</output></p>
{/each}
