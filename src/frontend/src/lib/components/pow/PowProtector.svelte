<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { type BaseWorker, initPowWorker } from '$lib/services/worker.pow.services';

	let powWorker: BaseWorker | undefined;

	onMount(async () => {
		// Initialize the worker
		powWorker = await initPowWorker();
		// Start the worker
		powWorker.startPowWorker();
	});

	onDestroy(() => destroyWorker());

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	function stopWorker() {
		powWorker?.stopPowWorker();
	}

	function destroyWorker() {
		powWorker?.destroyPowWorker();
		powWorker = undefined;
	}
</script>

<slot />
