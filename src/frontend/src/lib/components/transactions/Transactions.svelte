<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import BtcTransactions from '$btc/components/transactions/BtcTransactions.svelte';
	import EthTransactions from '$eth/components/transactions/EthTransactions.svelte';
	import IcTransactions from '$icp/components/transactions/IcTransactions.svelte';
	import { routeNetwork, routeToken } from '$lib/derived/nav.derived';
	import { networkBitcoin, networkICP, networkSolana } from '$lib/derived/network.derived';
	import SolTransactions from '$sol/components/transactions/SolTransactions.svelte';
</script>

{#if nonNullish($routeNetwork)}
	{#if $networkICP}
		<IcTransactions />
	{:else if $networkBitcoin}
		<BtcTransactions />
	{:else if $networkSolana}
		<SolTransactions />
	{:else if nonNullish($routeToken)}
		<EthTransactions />
	{/if}
{/if}
