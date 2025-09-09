<script lang="ts">
	import { type Snippet, onDestroy, onMount, type Snippet } from 'svelte';
	import { POW_FEATURE_ENABLED } from '$env/pow.env';
	import { initPowProtectorWorker } from '$icp/services/worker.pow-protection.services';
	import type { PowProtectorWorkerInitResult } from '$icp/types/pow-protector-listener';

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

		onDestroy(() => powWorker?.destroy());
	}
</script>

{@render children?.()}
