<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { POW_ENABLED } from '$env/pow.env';
	import { initPowProtectorWorker } from '$icp/services/worker.pow-protection.services';
	import type { PowProtectorWorkerInitResult } from '$icp/types/pow-protector-listener';

	if (POW_ENABLED) {
		let powWorker: PowProtectorWorkerInitResult;

		onMount(async () => {
			// Initialize the worker
			powWorker = await initPowProtectorWorker();
			// Start the worker
			powWorker.start();
		});

		onDestroy(() => powWorker?.stop());
	}
</script>

<slot />
