<script lang="ts">
	import { debounce } from '@dfinity/utils';
	import { onDestroy, onMount } from 'svelte';
	import { EXCHANGE_DISABLED } from '$env/exchange.env';
	import { enabledIcrcLedgerCanisterIdsNoCk } from '$icp/derived/icrc.derived';
	import { enabledMergedErc20TokensAddresses } from '$icp-eth/derived/icrc-erc20.derived';
	import { type ExchangeWorker, initExchangeWorker } from '$lib/services/worker.exchange.services';
	import { enabledSplTokenAddresses } from '$sol/derived/spl.derived';

	let worker: ExchangeWorker | undefined;

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
		worker?.startExchangeTimer({
			erc20Addresses: $enabledMergedErc20TokensAddresses,
			icrcCanisterIds: $enabledIcrcLedgerCanisterIdsNoCk,
			splAddresses: $enabledSplTokenAddresses
		});
	};

	const debounceSyncTimer = debounce(syncTimer, 1000);

	$: worker,
		$enabledMergedErc20TokensAddresses,
		$enabledIcrcLedgerCanisterIdsNoCk,
		$enabledSplTokenAddresses,
		debounceSyncTimer();
</script>

<slot />
