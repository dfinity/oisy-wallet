<script lang="ts">
	import {
		initTransactionsListener as initListenerSockets,
		type WebSocketListener
	} from '$lib/providers/infura.providers';
	import { isNullish } from '@dfinity/utils';
	import { type AddressData, addressStore } from '$lib/stores/address.store';
	import { onDestroy } from 'svelte';

	let listener: WebSocketListener | undefined = undefined;

	const initListener = async (address: AddressData) => {
		await listener?.destroy();

		if (isNullish(address)) {
			return;
		}

		listener = initListenerSockets(address);
	};

	$: (async () => initListener($addressStore))();

	onDestroy(async () => await listener?.destroy());
</script>

<slot />
