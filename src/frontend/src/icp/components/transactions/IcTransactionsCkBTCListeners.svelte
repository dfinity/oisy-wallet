<script lang="ts">
	import { tokenId } from '$lib/derived/token.derived';
	import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
	import IcCkListener from '$icp/components/core/IcCkListener.svelte';
	import { initCkBTCWalletWorker } from '$icp/services/worker.ckbtc-wallet.services';
	import { initCkBTCMinterInfoWorker } from '$icp/services/worker.ck-minter-info.services';

	let minterInfoLoaded: boolean;
	$: minterInfoLoaded = $ckBtcMinterInfoStore?.[$tokenId]?.certified === true;
</script>

<IcCkListener initFn={initCkBTCWalletWorker} />

{#if !minterInfoLoaded}
	<IcCkListener initFn={initCkBTCMinterInfoWorker} />
{/if}

<slot />
