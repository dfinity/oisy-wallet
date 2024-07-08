<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { routeNetwork, routeToken } from '$lib/derived/nav.derived.js';
	import { networkICP } from '$lib/derived/network.derived.js';
	import IcTransactions from '$icp/components/transactions/IcTransactions.svelte';
	import Transactions from '$eth/components/transactions/Transactions.svelte';
</script>

{#if nonNullish($routeNetwork)}
	{#if $networkICP}
		<IcTransactions />
	{:else if nonNullish($routeToken)}
		<Transactions />
	{/if}
{/if}
