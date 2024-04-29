<script lang="ts">
	import { token, tokenId } from '$lib/derived/token.derived';
	import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
	import IcCkListener from '$icp/components/core/IcCkListener.svelte';
	import { initBtcStatusesWorker } from '$icp/services/worker.btc-statuses.services';
	import { initCkBTCMinterInfoWorker } from '$icp/services/worker.ck-minter-info.services';
	import { initCkBTCUpdateBalanceWorker } from '$icp/services/worker.ckbtc-update-balance.services';
	import type { IcCkToken } from '$icp/types/ic';
	import type { Token } from '$lib/types/token';

	let minterInfoLoaded: boolean;
	$: minterInfoLoaded = $ckBtcMinterInfoStore?.[$tokenId]?.certified === true;

	let twinToken: Token | undefined;
	$: twinToken = ($token as IcCkToken).twinToken;
</script>

<IcCkListener initFn={initBtcStatusesWorker} token={$token} {twinToken} />
<IcCkListener initFn={initCkBTCUpdateBalanceWorker} token={$token} {twinToken} />

{#if !minterInfoLoaded}
	<IcCkListener initFn={initCkBTCMinterInfoWorker} token={$token} {twinToken} />
{/if}

<slot />
