<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { IcCkToken } from '$icp/types/ic';
	import type { IcCkWorker, IcCkWorkerInitResult } from '$icp/types/ck-listener';
	import type { Token } from '$lib/types/token';
	import type { CanisterIdText } from '$lib/types/canister';

	export let initFn: IcCkWorker;
	export let token: Token;
	export let minterCanisterId: CanisterIdText | undefined = undefined;

	let worker: IcCkWorkerInitResult | undefined;

	onMount(
		async () =>
			(worker = await initFn({
				minterCanisterId: minterCanisterId ?? (token as IcCkToken).minterCanisterId,
				token
			}))
	);

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
