<script lang="ts">
	import { token, tokenId } from '$lib/derived/token.derived';
	import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
	import IcCkListener from '$icp/components/core/IcCkListener.svelte';
	import { initBtcStatusesWorker } from '$icp/services/worker.btc-statuses.services';
	import { initCkBTCMinterInfoWorker } from '$icp/services/worker.ck-minter-info.services';
	import { initCkBTCUpdateBalanceWorker } from '$icp/services/worker.ckbtc-update-balance.services';

	let minterInfoLoaded: boolean;
	$: minterInfoLoaded = $ckBtcMinterInfoStore?.[$tokenId]?.certified === true;
</script>

<IcCkListener initFn={initBtcStatusesWorker} token={$token} />
<IcCkListener initFn={initCkBTCUpdateBalanceWorker} token={$token} />

{#if !minterInfoLoaded}
	<IcCkListener initFn={initCkBTCMinterInfoWorker} token={$token} />
{/if}

<slot />
