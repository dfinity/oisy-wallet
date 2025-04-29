<script lang="ts">
	import { onDestroy, onMount ,type  Snippet } from 'svelte';
	import { initPowProtectorWorker } from '$icp/services/worker.pow-protection.services';
	import type { PowProtectorWorkerInitResult } from '$icp/types/pow-protector-listener';

	interface Props {
		children?: Snippet;
	}
	let { children }: Props = $props();

	if (false) {
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
