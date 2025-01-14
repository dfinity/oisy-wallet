<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { onDestroy } from 'svelte';
	import { initTransactionsListener } from '$eth/services/eth-listener.services';
	import { ethAddress } from '$lib/derived/address.derived';
	import type { OptionEthAddress } from '$lib/types/address';
	import type { WebSocketListener } from '$lib/types/listener';
	import type { Token } from '$lib/types/token';

	export let token: Token;

	let listener: WebSocketListener | undefined = undefined;

	const initListener = async ({ address }: { address: OptionEthAddress }) => {
		await listener?.disconnect();

		if (isNullish(address)) {
			return;
		}

		listener = initTransactionsListener({ address, token });
	};

	$: (async () => await initListener({ address: $ethAddress }))();

	onDestroy(async () => await listener?.disconnect());
</script>

<slot />
