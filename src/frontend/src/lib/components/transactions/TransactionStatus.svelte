<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { getBlockNumber } from '$lib/providers/infura.providers';
	import { toastsError } from '$lib/stores/toasts.store';
	import { fade } from 'svelte/transition';
	import type { WebSocketListener } from '$lib/types/listener';
	import { initMinedTransactionsListener } from '$lib/services/listener.services';

	export let blockNumber: number;

	let listener: WebSocketListener | undefined = undefined;

	let currentBlockNumber: number | undefined;

	const loadCurrentBlockNumber = async () => {
		try {
			currentBlockNumber = await getBlockNumber();
		} catch (err: unknown) {
			disconnect();
			currentBlockNumber = undefined;

			toastsError({
				msg: { text: 'Cannot get block number.' },
				err
			});
		}
	};

	const disconnect = () => {
		listener?.disconnect();
		listener = undefined;
	};

	onMount(async () => {
		await loadCurrentBlockNumber();

		listener = initMinedTransactionsListener(loadCurrentBlockNumber);
	});

	onDestroy(disconnect);

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

		disconnect();
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
