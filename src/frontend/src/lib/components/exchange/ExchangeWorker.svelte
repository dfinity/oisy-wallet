<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { ExchangeWorker } from '$lib/services/worker.exchange.services';
	import { initExchangeWorker } from '$lib/services/worker.exchange.services';
	import { erc20TokensAddresses } from '$lib/derived/erc20.derived';

	let worker: ExchangeWorker | undefined;

	onMount(async () => (worker = await initExchangeWorker()));

	onDestroy(() => worker?.stopExchangeTimer());

	const syncTimer = () => {
		worker?.stopExchangeTimer();
		worker?.startExchangeTimer({ erc20Addresses: $erc20TokensAddresses });
	};

	$: worker, $erc20TokensAddresses, syncTimer();
</script>

<slot />
