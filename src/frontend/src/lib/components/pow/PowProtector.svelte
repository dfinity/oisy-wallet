<script lang="ts">
	import { onDestroy, onMount, type Snippet } from 'svelte';
	import { POW_FEATURE_ENABLED } from '$env/pow.env';
	import type { PowProtectorWorkerInitResult } from '$icp/services/pow-protector-listener.services';
	import { initPowProtectorWorker } from '$icp/services/worker.pow-protection.services';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();

	if (POW_FEATURE_ENABLED) {
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

{@render children?.()}
