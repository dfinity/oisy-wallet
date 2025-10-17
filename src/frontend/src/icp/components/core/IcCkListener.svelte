<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { IcCkWorker, IcCkWorkerInitResult } from '$icp/types/ck-listener';
	import type { OptionIcCkToken } from '$icp/types/ic-token';
	import type { CanisterIdText } from '$lib/types/canister';
	import type { Token } from '$lib/types/token';

	interface Props {
		initFn: IcCkWorker;
		token: Token;
		twinToken?: Token;
		minterCanisterId?: CanisterIdText;
	}

	let { initFn, token, twinToken, minterCanisterId }: Props = $props();

	let worker: IcCkWorkerInitResult | undefined;

	onMount(async () => {
		worker = await initFn({
			minterCanisterId: minterCanisterId ?? (token as OptionIcCkToken)?.minterCanisterId,
			token,
			twinToken
		});

		worker?.stop();
		worker?.start();
	});

	onDestroy(() => worker?.destroy());

	const triggerTimer = () => {
		worker?.trigger();
	};
</script>

<svelte:window onoisyTriggerWallet={triggerTimer} />
