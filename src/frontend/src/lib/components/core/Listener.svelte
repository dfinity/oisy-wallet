<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { type AddressData, addressStore } from '$lib/stores/address.store';
	import { onDestroy } from 'svelte';
	import { initTransactionsListener } from '$lib/services/listener.services';
	import type { WebSocketListener } from '$lib/types/listener';
	import type { Token } from '$lib/types/token';

	export let token: Token;

	let listener: WebSocketListener | undefined = undefined;

	const initListener = async ({ address }: { address: AddressData }) => {
		await listener?.disconnect();

		if (isNullish(address)) {
			return;
		}

		listener = initTransactionsListener({ address, token });
	};

	$: (async () => initListener({ address: $addressStore }))();

	onDestroy(async () => await listener?.disconnect());
</script>

<slot />
