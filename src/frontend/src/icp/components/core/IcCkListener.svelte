<script lang="ts">
	import { type Snippet, onDestroy, onMount } from 'svelte';
	import { run } from 'svelte/legacy';
	import type { IcCkWorker, IcCkWorkerInitResult } from '$icp/types/ck-listener';
	import type { OptionIcCkToken } from '$icp/types/ic-token';
	import type { CanisterIdText } from '$lib/types/canister';
	import type { Token } from '$lib/types/token';

	interface Props {
		initFn: IcCkWorker;
		token: Token;
		twinToken?: Token | undefined;
		minterCanisterId?: CanisterIdText | undefined;
		children?: Snippet;
	}

	let {
		initFn,
		token,
		twinToken = undefined,
		minterCanisterId = undefined,
		children
	}: Props = $props();

	let worker: IcCkWorkerInitResult | undefined = $state();

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

	run(() => {
		(worker, syncTimer());
	});

	const triggerTimer = () => worker?.trigger();
</script>

<svelte:window onoisyTriggerWallet={triggerTimer} />

{@render children?.()}
