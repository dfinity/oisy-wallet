<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { ExchangeWorker } from '$lib/services/worker.exchange.services';
	import { initExchangeWorker } from '$lib/services/worker.exchange.services';
	import { erc20TokensAddresses } from '$lib/derived/erc20.derived';
	import type { ICPWalletWorker } from '$lib/services/worker.icp-wallet.services';
	import { initICPWalletWorker } from '$lib/services/worker.icp-wallet.services.js';

	let worker: ExchangeWorker | undefined;

	onMount(async () => {
		worker = await initExchangeWorker();

		icpWalletWorker = await initICPWalletWorker();
	});

	onDestroy(() => worker?.destroy());

	const syncTimer = () => {
		worker?.stopExchangeTimer();
		worker?.startExchangeTimer({ erc20Addresses: $erc20TokensAddresses });
	};

	$: worker, $erc20TokensAddresses, syncTimer();

	/**
	 * TODO: remove or move, just for test
	 */
	let icpWalletWorker: ICPWalletWorker | undefined;
	$: icpWalletWorker, icpWalletWorker?.start({ callback: () => console.log('test') });
</script>

<slot />
