<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import {
		type IcpWalletWorker,
		initIcpWalletWorker
	} from '$lib/services/worker.icp-wallet.services';
	import { ICP_TOKEN } from '$lib/constants/tokens.constants';

	// eslint-disable-next-line svelte/valid-compile
	export let token = ICP_TOKEN;

	let worker: IcpWalletWorker | undefined;

	onMount(async () => (worker = await initIcpWalletWorker()));

	onDestroy(() => worker?.stop());

	const syncTimer = () => {
		worker?.stop();
		worker?.start();
	};

	$: worker, syncTimer();
</script>

<slot />
