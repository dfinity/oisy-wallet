<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { type AddressData } from '$lib/stores/address.store';
	import { address } from '$lib/derived/address.derived';
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

	$: (async () => initListener({ address: $address }))();

	onDestroy(async () => await listener?.disconnect());
</script>

<slot />
