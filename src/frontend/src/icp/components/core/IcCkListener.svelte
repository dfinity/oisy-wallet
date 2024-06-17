<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { OptionIcCkToken } from '$icp/types/ic';
	import type { IcCkWorker, IcCkWorkerInitResult } from '$icp/types/ck-listener';
	import type { OptionToken, Token } from '$lib/types/token';
	import type { CanisterIdText } from '$lib/types/canister';

	export let initFn: IcCkWorker;
	export let token: OptionToken;
	export let twinToken: Token | undefined = undefined;
	export let minterCanisterId: CanisterIdText | undefined = undefined;

	let worker: IcCkWorkerInitResult | undefined;

	onMount(
		async () =>
			(worker = await initFn({
				minterCanisterId: minterCanisterId ?? (token as OptionIcCkToken)?.minterCanisterId,
				token,
				twinToken
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
