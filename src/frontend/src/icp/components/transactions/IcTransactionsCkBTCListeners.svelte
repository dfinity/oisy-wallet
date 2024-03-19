<script lang="ts">
	import { tokenId } from '$lib/derived/token.derived';
	import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
	import IcCkListener from '$icp/components/core/IcCkListener.svelte';
	import { initCkBTCWalletWorker } from '$icp/services/worker.ckbtc-wallet.services';
	import { initCkBTCMinterInfoWorker } from '$icp/services/worker.ck-minter-info.services';
	import { initCkBTCUpdateBalanceWorker } from '$icp/services/worker.ckbtc-update-balance.services';

	let minterInfoLoaded: boolean;
	$: minterInfoLoaded = $ckBtcMinterInfoStore?.[$tokenId]?.certified === true;
</script>

<IcCkListener initFn={initCkBTCWalletWorker} />
<IcCkListener initFn={initCkBTCUpdateBalanceWorker} />

{#if !minterInfoLoaded}
	<IcCkListener initFn={initCkBTCMinterInfoWorker} />
{/if}

<slot />
