<script lang="ts">
	import { debounce, isNullish, nonNullish } from '@dfinity/utils';
	import { onDestroy, onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { infuraProviders } from '$eth/providers/infura.providers';
	import { initMinedTransactionsListener } from '$eth/services/eth-listener.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { WebSocketListener } from '$lib/types/listener';
	import type { Token } from '$lib/types/token';

	export let blockNumber: number;
	export let token: Token;

	//TODO: upgrade component to svelte 5 and check if async works properly in onMount component

	let listener: WebSocketListener | undefined = undefined;

	let currentBlockNumber: number | undefined;

	const loadCurrentBlockNumber = async () => {
		try {
			const { getBlockNumber } = infuraProviders(token.network.id);
			currentBlockNumber = await getBlockNumber();
		} catch (err: unknown) {
			disconnect();
			currentBlockNumber = undefined;

			toastsError({
				msg: { text: $i18n.transaction.error.get_block_number },
				err
			});
		}
	};

	const disconnect = () => {
		listener?.disconnect();
		listener = undefined;
	};

	const debounceLoadCurrentBlockNumber = debounce(loadCurrentBlockNumber);

	onMount(() => {
		loadCurrentBlockNumber();

		listener = initMinedTransactionsListener({
			// eslint-disable-next-line require-await
			callback: async () => debounceLoadCurrentBlockNumber(),
			networkId: token.network.id
		});
	});

	onDestroy(disconnect);

	let status: 'included' | 'safe' | 'finalised' | undefined;

	$: (() => {
		if (status === 'finalised') {
			disconnect();
			return;
		}

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

<label for="to">{$i18n.transaction.text.status}</label>

<span id="to" class="break-all font-normal first-letter:capitalize">
	{#if nonNullish(status)}
		<span in:fade>{$i18n.transaction.status[status]}</span>
	{:else}
		<span style="visibility: hidden; opacity: 0">&nbsp;</span>
	{/if}
</span>
