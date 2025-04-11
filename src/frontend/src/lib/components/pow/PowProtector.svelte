<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { POW_ENABLED } from '$env/pow.env';
	import { type BaseWorker, initPowWorker } from '$lib/services/worker.pow.services';

	let powWorker: BaseWorker | undefined;

	if (POW_ENABLED) {
		onMount(async () => {
			// Initialize the worker
			powWorker = await initPowWorker();
			// Start the worker
			powWorker.startPowWorker();
		});

		onDestroy(() => {
			destroyWorker();
		});

		function _stopWorker() {
			powWorker?.stopPowWorker();
		}

		function destroyWorker() {
			powWorker?.destroyPowWorker();
			powWorker = undefined;
		}
	}
</script>

<slot />
