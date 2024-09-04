<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { routeNetwork, routeToken } from '$lib/derived/nav.derived';
	import { networkBitcoin, networkICP } from '$lib/derived/network.derived';
	import IcTransactions from '$icp/components/transactions/IcTransactions.svelte';
	import Transactions from '$eth/components/transactions/Transactions.svelte';
	import BtcTransactions from '$btc/components/BtcTransactions.svelte';
</script>

{#if nonNullish($routeNetwork)}
	{#if $networkICP}
		<IcTransactions />
	{:else if $networkBitcoin}
		<BtcTransactions />
	{:else if nonNullish($routeToken)}
		<Transactions />
	{/if}
{/if}
