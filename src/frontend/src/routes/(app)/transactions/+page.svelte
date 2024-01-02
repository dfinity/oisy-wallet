<script lang="ts">
	import Transactions from '$lib/components/transactions/Transactions.svelte';
	import { routeNetwork, routeToken } from '$lib/derived/nav.derived';
	import IcTransactions from '$lib/components/transactions/icp/IcTransactions.svelte';
	import { AIRDROP } from '$lib/constants/airdrop.constants';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { onMount } from 'svelte';
	import { networkICP } from '$lib/derived/network.derived';
	import { goto } from '$app/navigation';

	onMount(async () => {
		// We need to know the network on which the transactions should be loaded.
		// While we can guess the network for ICP, we cannot do the same for ICRC tokens as they are loaded asynchronously.
		// Therefore, we cannot automatically select the network if it is not provided when the component mounts, and we cannot wait indefinitely.
		// That's why, if no network is provided, we route to the root.
		if (isNullish($routeNetwork)) {
			await goto('/');
		}
	});
</script>

<h2 class="text-base mb-6 pb-1" class:mt-12={AIRDROP} class:mt-16={!AIRDROP}>Transactions</h2>

{#if nonNullish($routeNetwork)}
	{#if $networkICP}
		<IcTransactions />
	{:else if nonNullish($routeToken)}
		<Transactions />
	{/if}
{/if}
