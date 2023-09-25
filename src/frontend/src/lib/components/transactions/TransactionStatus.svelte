<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getBlockNumber } from '$lib/providers/infura.providers';
	import { toastsError } from '$lib/stores/toasts.store';
	import { fade } from 'svelte/transition';

	export let blockNumber: number;

	let timer: NodeJS.Timeout | undefined;

	let currentBlockNumber: number | undefined;

	const loadCurrentBlockNumber = async () => {
		try {
			currentBlockNumber = await getBlockNumber();
		} catch (err: unknown) {
			clearTimer();
			currentBlockNumber = undefined;

			toastsError({
				msg: { text: 'Cannot get block number.' },
				err
			});
		}
	};

	const clearTimer = () => {
		if (isNullish(timer)) {
			return;
		}

		clearInterval(timer);
		timer = undefined;
	};

	onMount(async () => {
		await loadCurrentBlockNumber();

		timer = setInterval(loadCurrentBlockNumber, 60000);
	});

	onDestroy(clearTimer);

	let status: 'included' | 'safe' | 'finalised' | undefined;

	$: (() => {
		if (isNullish(currentBlockNumber)) {
			status = undefined;
			return;
		}

		const diff = currentBlockNumber - blockNumber;

		if (diff < 32) {
			status = 'included';
			return;
		}

		if (diff < 64) {
			status = 'safe';
			return;
		}

		status = 'finalised';

		clearTimer();
	})();
</script>

<label for="to" class="font-bold px-1.25">Status:</label>

<p id="to" class="font-normal mb-2 px-1.25 break-words" style="text-transform: capitalize;">
	{#if nonNullish(status)}
		<span in:fade>{status}</span>
	{:else}
		<span style="visibility: hidden; opacity: 0">&nbsp;</span>
	{/if}
</p>
