<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { onDestroy } from 'svelte';
	import type { WebSocketListener } from '$eth/types/listener';
	import { address } from '$lib/derived/address.derived';
	import type { OptionAddress } from '$lib/types/address';
	import { initPendingTransactionsListener as initEthPendingTransactionsListenerProvider } from '$eth/providers/alchemy.providers';
	import { processEthTransaction } from '$eth/services/transaction.services';

	let listener: WebSocketListener | undefined = undefined;

	const initListener = async ({ address }: { address: OptionAddress }) => {
		await listener?.disconnect();

		console.log('HERE', address);

		if (isNullish(address)) {
			return;
		}

		listener = initEthPendingTransactionsListenerProvider({
			address: '0xb44B5e756A894775FC32EDdf3314Bb1B1944dC34',
			listener: async (hash: string) => await processEthTransaction({ hash })
		});
	};

	$: (async () => initListener({ address: $address }))();

	onDestroy(async () => await listener?.disconnect());
</script>

<slot />
