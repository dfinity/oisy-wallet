<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { IcCkWorker, IcCkWorkerInitResult } from '$icp/types/ck-listener';
	import type { OptionIcCkToken } from '$icp/types/ic-token';
	import type { CanisterIdText } from '$lib/types/canister';
	import type { Token } from '$lib/types/token';

	export let initFn: IcCkWorker;
	export let token: Token;
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

	onDestroy(() => worker?.destroy());

	const syncTimer = () => {
		worker?.stop();
		worker?.start();
	};

	$: (worker, syncTimer());

	const triggerTimer = () => worker?.trigger();
</script>

<svelte:window onoisyTriggerWallet={triggerTimer} />

<slot />
