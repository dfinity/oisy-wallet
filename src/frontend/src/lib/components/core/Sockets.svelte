<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { type AddressData, addressStore } from '$lib/stores/address.store';
	import { onDestroy } from 'svelte';
	import type { WebSocketListener } from '$lib/providers/alchemy.providers';
	import { initPendingTransactionsListener } from '$lib/services/listener.services';

	let listener: WebSocketListener | undefined = undefined;

	const initListener = async (address: AddressData) => {
		listener?.removeAllListeners();

		if (isNullish(address)) {
			return;
		}

		listener = initPendingTransactionsListener(address);
	};

	$: (async () => initListener($addressStore))();

	onDestroy(() => listener?.removeAllListeners());
</script>

<slot />
