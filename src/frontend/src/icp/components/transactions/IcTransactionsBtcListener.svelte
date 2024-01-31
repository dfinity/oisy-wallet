<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { IcToken } from '$icp/types/ic';
	import type { BtcStatusesWorker } from '$icp/types/btc-listener';
	import { initBtcStatusesWorker } from '$icp/services/worker.btc-statuses.services';
	import { token } from '$lib/derived/token.derived';

	let worker: BtcStatusesWorker | undefined;

	onMount(async () => (worker = await initBtcStatusesWorker($token as IcToken)));

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
