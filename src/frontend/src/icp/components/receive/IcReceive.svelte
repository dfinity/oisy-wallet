<script lang="ts">
	import { tokenCkBtcLedger, tokenCkEthLedger } from '$icp/derived/ic-token.derived';
	import IcReceiveCkETH from '$icp/components/receive/IcReceiveCkETH.svelte';
	import IcReceiveIcp from '$icp/components/receive/IcReceiveICP.svelte';
	import IcReceiveCkBTC from '$icp/components/receive/IcReceiveCkBTC.svelte';
</script>

{#if $tokenCkEthLedger}
	<IcReceiveCkETH />
{:else if $tokenCkBtcLedger}
	<IcReceiveCkBTC />
{:else}
	<IcReceiveIcp />
{/if}
