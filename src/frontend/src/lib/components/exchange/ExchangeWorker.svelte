<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { ExchangeWorker } from '$lib/services/worker.exchange.services';
	import { initExchangeWorker } from '$lib/services/worker.exchange.services';
	import { exchangeStore } from '$lib/stores/exchange.store';

	let worker: ExchangeWorker | undefined;

	onMount(async () => {
		worker = await initExchangeWorker();
		worker.startExchangeTimer();
	});

	onDestroy(() => worker?.stopExchangeTimer());

	$: console.log($exchangeStore);
</script>

<slot />
