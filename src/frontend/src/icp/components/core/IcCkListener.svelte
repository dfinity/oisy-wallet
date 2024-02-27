<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { IcToken } from '$icp/types/ic';
	import type { IcCkWorker, IcCkWorkerInitResult } from '$icp/types/ck-listener';
	import { token } from '$lib/derived/token.derived';

	export let initFn: IcCkWorker;

	let worker: IcCkWorkerInitResult | undefined;

	onMount(async () => (worker = await initFn($token as IcToken)));

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
