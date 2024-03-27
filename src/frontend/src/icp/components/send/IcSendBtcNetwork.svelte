<script lang="ts">
	import type { NetworkId } from '$lib/types/network';
	import { BTC_MAINNET_NETWORK_ID } from '$env/networks.env';
	import { BTC_MAINNET_TOKEN, BTC_TESTNET_TOKEN } from '$env/tokens.btc.env';

	export let networkId: NetworkId;
</script>

{#if BTC_MAINNET_NETWORK_ID === networkId}
	{BTC_MAINNET_TOKEN.name}
{:else}
	{BTC_TESTNET_TOKEN.name}
{/if}
