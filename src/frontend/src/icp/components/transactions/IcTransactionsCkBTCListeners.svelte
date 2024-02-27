<script lang="ts">
	import { tokenId } from '$lib/derived/token.derived';
	import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
	import IcTransactionsCkBTCListener from '$icp/components/transactions/IcTransactionsCkBTCListener.svelte';
	import { initCkBTCWalletWorker } from '$icp/services/worker.ckbtc-wallet.services';
	import { initCkBTCMinterInfoWorker } from '$icp/services/worker.ck-minter-info.services';

	let minterInfoLoaded: boolean;
	$: minterInfoLoaded = $ckBtcMinterInfoStore?.[$tokenId]?.certified === true;
</script>

<IcTransactionsCkBTCListener initFn={initCkBTCWalletWorker} />

{#if !minterInfoLoaded}
	<IcTransactionsCkBTCListener initFn={initCkBTCMinterInfoWorker} />
{/if}

<slot />
