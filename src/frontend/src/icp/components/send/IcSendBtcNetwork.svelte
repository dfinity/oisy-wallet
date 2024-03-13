<script lang="ts">
	import { BtcNetwork } from '@dfinity/ckbtc';
	import { BTC_NETWORK } from '$env/networks.btc.env';
</script>

{#if BTC_NETWORK === BtcNetwork.Mainnet}
	Bitcoin
{:else if BTC_NETWORK === BtcNetwork.Testnet}
	Bitcoin (Testnet)
{:else if BTC_NETWORK === BtcNetwork.Regtest}
	Bitcoin (Regtest)
{/if}
