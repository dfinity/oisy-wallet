<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import {
		type IcpWalletWorker,
		initIcpWalletWorker
	} from '$lib/services/worker.icp-wallet.services';

	let worker: IcpWalletWorker | undefined;

	onMount(async () => (worker = await initIcpWalletWorker()));

	onDestroy(() => worker?.stop());

	const syncTimer = () => {
		worker?.stop();
		worker?.start({ callback: () => console.log('TODO') });
	};

	$: worker, syncTimer();
</script>

<slot />
