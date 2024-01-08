<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { onDestroy } from 'svelte';
	import { initTransactionsListener } from '../../services/eth-listener.services';
	import type { WebSocketListener } from '$lib/types/listener';
	import type { Token } from '$lib/types/token';
	import { address } from '$lib/derived/address.derived';
	import type { OptionAddress } from '$lib/types/address';

	export let token: Token;

	let listener: WebSocketListener | undefined = undefined;

	const initListener = async ({ address }: { address: OptionAddress }) => {
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
