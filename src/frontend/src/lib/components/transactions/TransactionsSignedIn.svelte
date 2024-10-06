<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import BtcTransactions from '$btc/components/BtcTransactions.svelte';
	import Transactions from '$eth/components/transactions/Transactions.svelte';
	import IcTransactions from '$icp/components/transactions/IcTransactions.svelte';
	import type { OptionToken } from '$lib/types/token';
	import { isNetworkBTC, isNetworkETH, isNetworkICP } from '$lib/utils/network.utils';

	export let token: OptionToken;
</script>

{#if nonNullish(token)}
	{#if isNetworkICP(token.network)}
		<IcTransactions {token} />
	{:else if isNetworkBTC(token.network)}
		<BtcTransactions />
	{:else if isNetworkETH(token.network)}
		<Transactions {token} />
	{/if}
{/if}
