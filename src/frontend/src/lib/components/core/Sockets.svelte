<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { type AddressData, addressStore } from '$lib/stores/address.store';
	import { onDestroy } from 'svelte';
	import { initPendingTransactionsListener } from '$lib/services/listener.services';
	import type { WebSocketListener } from '$lib/types/listener';

	let listener: WebSocketListener | undefined = undefined;

	const initListener = async (address: AddressData) => {
		await listener?.disconnect();

		if (isNullish(address)) {
			return;
		}

		listener = initPendingTransactionsListener(address);
	};

	$: (async () => initListener($addressStore))();

	onDestroy(async () => await listener?.disconnect());
</script>

<slot />
