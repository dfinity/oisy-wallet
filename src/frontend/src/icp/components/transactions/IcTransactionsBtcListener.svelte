<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { IcToken } from '$icp/types/ic';
	import type { CkBTCWalletWorker } from '$icp/types/ckbtc-listener';
	import { initCkBTCWalletWorker } from '$icp/services/worker.ckbtc-wallet.services';
	import { token } from '$lib/derived/token.derived';

	let worker: CkBTCWalletWorker | undefined;

	onMount(async () => (worker = await initCkBTCWalletWorker($token as IcToken)));

	onDestroy(() => worker?.stop());

	const syncTimer = () => {
		worker?.stop();
		worker?.start();
	};

	$: worker, syncTimer();

	const triggerTimer = () => worker?.trigger();
</script>

<svelte:window on:oisyTriggerWallet={triggerTimer} />

<slot />
