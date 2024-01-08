<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { Token } from '$lib/types/token';
	import {
		initIcrcWalletWorker,
		type WalletWorker
	} from '$icp/services/worker.icrc-wallet.services';
	import { initIcpWalletWorker } from '$icp/services/worker.icp-wallet.services';
	import type { IcToken } from '$icp/types/ic';

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
</script>

<slot />
