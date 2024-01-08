<script lang="ts">
	import { BTC_NETWORK } from '$icp/constants/ckbtc.constants';
	import { BtcNetwork } from '@dfinity/ckbtc';
</script>

{#if BTC_NETWORK === BtcNetwork.Mainnet}
	Bitcoin
{:else if BTC_NETWORK === BtcNetwork.Testnet}
	Bitcoin (Testnet)
{:else if BTC_NETWORK === BtcNetwork.Regtest}
	Bitcoin (Regtest)
{/if}
