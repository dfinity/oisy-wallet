<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { getBlockNumber } from '$eth/providers/infura.providers';
	import { toastsError } from '$lib/stores/toasts.store';
	import { fade } from 'svelte/transition';
	import type { WebSocketListener } from '$eth/types/listener';
	import { initMinedTransactionsListener } from '$eth/services/eth-listener.services';

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

	const debounceLoadCurrentBlockNumber = debounce(loadCurrentBlockNumber);

	onMount(async () => {
		await loadCurrentBlockNumber();

		listener = initMinedTransactionsListener(async () => debounceLoadCurrentBlockNumber());
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

<label for="to" class="font-bold px-4.5">Status:</label>

<p id="to" class="font-normal mb-4 px-4.5 break-all" style="text-transform: capitalize;">
	{#if nonNullish(status)}
		<span in:fade>{status}</span>
	{:else}
		<span style="visibility: hidden; opacity: 0">&nbsp;</span>
	{/if}
</p>
