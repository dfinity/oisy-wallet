<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { address } from '$lib/derived/address.derived';
	import { onDestroy } from 'svelte';
	import { initTransactionsListener } from '$lib/services/listener.services';
	import type { WebSocketListener } from '$lib/types/listener';
	import type { Token } from '$lib/types/token';
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
