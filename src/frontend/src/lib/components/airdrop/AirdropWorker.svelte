<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { airdropAvailable } from '$lib/derived/airdrop.derived';
	import { isNullish } from '@dfinity/utils';
	import { isAirdropOver } from '$lib/utils/airdrop.utils';
	import type { PostMessage, PostMessageDataResponseAirdropCode } from '$lib/types/post-message';
	import { airdropStore } from '$lib/stores/airdrop.store';

	export let worker: Worker | undefined = undefined;

	const onWorkerMessage = async ({
		data: { msg, data }
	}: MessageEvent<PostMessage<PostMessageDataResponseAirdropCode>>) => {
		if (msg !== 'syncAirdropCode' || isNullish(data)) {
			return;
		}

		const { airdrop } = data;

		if ('Ok' in airdrop) {
			const { Ok } = airdrop;

			airdropStore.set(Ok);

			if (!isAirdropOver(Ok)) {
				// We continue to poll until code is redeemed and all children are also redeemed.
				return;
			}
		}

		stopTimer();
		return;
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

		if (isNullish($airdropStore)) {
			return;
		}

		if (isAirdropOver($airdropStore)) {
			return;
		}

		await startTimer();
	});

	onDestroy(stopTimer);
</script>

<slot />
