<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import BtcTransactions from '$btc/components/transactions/BtcTransactions.svelte';
	import EthTransactions from '$eth/components/transactions/EthTransactions.svelte';
	import IcTransactions from '$icp/components/transactions/IcTransactions.svelte';
	import { routeNetwork, routeToken } from '$lib/derived/nav.derived';
	import { networkBitcoin, networkICP, networkSolana } from '$lib/derived/network.derived';
	import SolTransactions from '$sol/components/transactions/SolTransactions.svelte';
	// import { createSolanaRpc, Connection, Keypair, createSolanaRpcSubscriptions, type Address } from '@solana/web3.js';
	// import { token } from '$lib/stores/token.store';
	// import { SOLANA_LOCAL_TOKEN, SOLANA_LOCAL_TOKEN_ID } from '$env/tokens/tokens.sol.env';
	// import { SOLANA_LOCAL_NETWORK } from '$env/networks/networks.sol.env';
	// import { solAddressLocal } from '$lib/derived/address.derived';
	//
	//
	// $: (async () => {
	// 	if ($token?.id != SOLANA_LOCAL_TOKEN_ID) {
	// 		return
	// 	}
	//
	// 	const subscription = createSolanaRpcSubscriptions(SOLANA_LOCAL_NETWORK.rpcUrl)
	//
	// 	const subscriptionId = subscription.accountNotifications(($solAddressLocal ?? '') as Address);
	//
	// 	await subscriptionId.subscribe({
	// 		next: (data) => {
	// 			console.log('Data:', data)
	// 		},
	// 		error: (error) => {
	// 			console.error('Error:', error)
	// 		},
	// 		complete: () => {
	// 			console.log('Complete')
	// 		}
	// 	})
	//
	// 	subscriptionId.then((id) => {
	// 		console.log('Subscription ID:', id)
	// 	})
	// })();
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
