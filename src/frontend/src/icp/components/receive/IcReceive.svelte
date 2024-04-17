<script lang="ts">
	import { tokenCkBtcLedger, tokenCkEthLedger } from '$icp/derived/ic-token.derived';
	import IcReceiveCkETH from '$icp/components/receive/IcReceiveCkETH.svelte';
	import IcReceiveIcp from '$icp/components/receive/IcReceiveICP.svelte';
	import IcReceiveCkBTC from '$icp/components/receive/IcReceiveCkBTC.svelte';
	import { tokenStandard } from '$lib/derived/token.derived';
	import IcReceiveIcrc from '$icp/components/receive/IcReceiveIcrc.svelte';
</script>

{#if $tokenCkEthLedger}
	<IcReceiveCkETH />
{:else if $tokenCkBtcLedger}
	<IcReceiveCkBTC />
{:else if $tokenStandard === 'icrc'}
	<IcReceiveIcrc />
{:else}
	<IcReceiveIcp />
{/if}
