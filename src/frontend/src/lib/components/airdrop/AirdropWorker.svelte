<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { airdropAvailable } from '$lib/derived/airdrop.derived';

	export let worker: Worker | undefined = undefined;

	const onWorkerMessage = async () => {
		console.log('MEssage');
	};

	const startTimer = async () => {
		const CodeWorker = await import('$lib/workers/code.worker?worker');
		worker = new CodeWorker.default();

		worker.onmessage = onWorkerMessage;

		worker.postMessage({ msg: 'startCodeTimer' });
	};

	const stopTimer = () => worker?.postMessage({ msg: 'stopCodeTimer' });

	onMount(async () => {
        if (!$airdropAvailable) {
			return;
		}

		await startTimer();
	});

	onDestroy(stopTimer);
</script>

<slot />
