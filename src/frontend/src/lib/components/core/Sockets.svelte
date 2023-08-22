<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { type AddressData, addressStore } from '$lib/stores/address.store';
	import { onDestroy } from 'svelte';
	import {
		initPendingTransactionsListener,
		initWalletConnectListener
	} from '$lib/services/listener.services';
	import type { WebSocketListener } from '$lib/types/listener';

	let listeners: WebSocketListener[] | undefined = undefined;

	const disconnect = async () =>
		await Promise.allSettled((listeners ?? []).map(({ disconnect }) => disconnect()));

	const initListener = async (address: AddressData) => {
		await disconnect();

		if (isNullish(address)) {
			return;
		}

		const results = await Promise.allSettled([
			initPendingTransactionsListener(address),
			initWalletConnectListener()
		]);

		listeners = results.filter(({ status }) => status === 'fulfilled').map(({ value }) => value);
	};

	$: (async () => initListener($addressStore))();

	onDestroy(disconnect);
</script>

<slot />
