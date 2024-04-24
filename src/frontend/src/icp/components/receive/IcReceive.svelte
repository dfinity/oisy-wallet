<script lang="ts">
	import {
		tokenCkBtcLedger,
		tokenCkErc20Ledger,
		tokenCkEthLedger
	} from '$icp/derived/ic-token.derived';
	import IcReceiveCkEthereum from '$icp/components/receive/IcReceiveCkEthereum.svelte';
	import IcReceiveIcp from '$icp/components/receive/IcReceiveICP.svelte';
	import IcReceiveCkBTC from '$icp/components/receive/IcReceiveCkBTC.svelte';
	import { tokenStandard } from '$lib/derived/token.derived';
	import IcReceiveIcrc from '$icp/components/receive/IcReceiveIcrc.svelte';
</script>

{#if $tokenCkEthLedger || $tokenCkErc20Ledger}
	<IcReceiveCkEthereum />
{:else if $tokenCkBtcLedger}
	<IcReceiveCkBTC />
{:else if $tokenStandard === 'icrc'}
	<IcReceiveIcrc />
{:else}
	<IcReceiveIcp />
{/if}
