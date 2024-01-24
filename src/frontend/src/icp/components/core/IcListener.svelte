<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { Token } from '$lib/types/token';
	import { initIcrcWalletWorker } from '$icp/services/worker.icrc-wallet.services';
	import { initIcpWalletWorker } from '$icp/services/worker.icp-wallet.services';
	import type { IcToken } from '$icp/types/ic';
	import type { WalletWorker } from '$icp/types/ic-listener';

	export let token: Token;

	let worker: WalletWorker | undefined;

	onMount(
		async () =>
			(worker = await (token.standard === 'icrc'
				? initIcrcWalletWorker(token as IcToken)
				: initIcpWalletWorker()))
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
