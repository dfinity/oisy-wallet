<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { Token } from '$lib/types/token';
	import {
		initIcrcWalletWorker,
		type WalletWorker
	} from '$lib/services/worker.icrc-wallet.services';
	import type { IcrcToken } from '$lib/types/icrc';
	import { initIcpWalletWorker } from '$lib/services/worker.icp-wallet.services';

	export let token: Token;

	let worker: WalletWorker | undefined;

	onMount(
		async () =>
			(worker = await (token.standard === 'icrc'
				? initIcrcWalletWorker(token as IcrcToken)
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
