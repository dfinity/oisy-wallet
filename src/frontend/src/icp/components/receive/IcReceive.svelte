<script lang="ts">
	import { tokenCkEthLedger } from '$icp/derived/ic-token.derived';
	import IcReceiveCkETH from '$icp/components/receive/IcReceiveCkETH.svelte';
	import IcReceiveAction from '$icp/components/receive/IcReceiveAction.svelte';
</script>

{#if $tokenCkEthLedger}
	<IcReceiveCkETH />
{:else}
	<IcReceiveAction />
{/if}
