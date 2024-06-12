<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { ExchangeWorker } from '$lib/services/worker.exchange.services';
	import { initExchangeWorker } from '$lib/services/worker.exchange.services';
	import { erc20TokensAddresses } from '$eth/derived/erc20.derived';

	let worker: ExchangeWorker | undefined;

	const EXCHANGE_DISABLED = JSON.parse(import.meta.env.VITE_EXCHANGE_DISABLED ?? false) === true;

	onMount(async () => {
		if (EXCHANGE_DISABLED) {
			// Using the exchange API during development if not necessary and given its limitation of calls per minute is annoying at it often throws errors on server reload.
			return;
		}

		worker = await initExchangeWorker();
	});

	onDestroy(() => worker?.destroy());

	const syncTimer = () => {
		worker?.stopExchangeTimer();
		worker?.startExchangeTimer({ erc20Addresses: $erc20TokensAddresses });
	};

	$: worker, $erc20TokensAddresses, syncTimer();
</script>

<slot />
