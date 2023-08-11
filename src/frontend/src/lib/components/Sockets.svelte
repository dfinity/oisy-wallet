<script lang="ts">
	import {
		initListener as initListenerSockets,
		type WebSocketListener
	} from '$lib/sockets/provider.sockets';
	import { isNullish } from '@dfinity/utils';
	import { type EthAddressData, ethAddressStore } from '$lib/stores/eth.store';
	import { onDestroy } from 'svelte';

	let listener: WebSocketListener | undefined = undefined;

	const initListener = async (address: EthAddressData) => {
		await listener?.destroy();

		if (isNullish(address)) {
			return;
		}

		listener = initListenerSockets(address);
	};

	$: (async () => initListener($ethAddressStore))();

	onDestroy(async () => await listener?.destroy());
</script>

<slot />
