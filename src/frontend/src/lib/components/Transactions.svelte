<script lang="ts">
	import { onMount } from 'svelte';
	import { transactions as transactionsService } from '$lib/services/provider.services';
	import type { TransactionResponse } from '@ethersproject/providers';
	import { utils } from 'ethers';
	import { ethAddressStore } from '$lib/stores/eth.store';

	let transactions: TransactionResponse[] = [];

	onMount(async () => {
		// TODO: error
		// TODO: watcher?
		transactions = await transactionsService($ethAddressStore!);
	});
</script>

{#each transactions as { from, to, value, blockNumber }}
	<hr />
	<p>From: <output>{from}</output></p>
	<p>To: <output>{to}</output></p>
	<p>Value: <output>{utils.formatEther(value.toString())}</output></p>
{/each}
