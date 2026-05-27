<script lang="ts">
	import { debounce } from '@dfinity/utils';
	import { onDestroy, onMount } from 'svelte';
	import { BACKEND_EXCHANGE_ENABLED, EXCHANGE_DISABLED } from '$env/exchange.env';
	import { erc4626TokensExchangeData } from '$eth/derived/erc4626.derived';
	import { enabledIcrcLedgerCanisterIdsNoCk } from '$icp/derived/icrc.derived';
	import { enabledMergedErc20TokensAddresses } from '$icp-eth/derived/icrc-erc20.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { loadBackendExchangeEnabled } from '$lib/services/backend-exchange-enabled.services';
	import { ExchangeWorker } from '$lib/services/worker.exchange.services';
	import { enabledSplTokenAddresses } from '$sol/derived/spl.derived';

	let worker = $state<ExchangeWorker | undefined>();
	let backendExchangeEnabled = $state<boolean>(BACKEND_EXCHANGE_ENABLED);

	onMount(async () => {
		if (EXCHANGE_DISABLED) {
			// Using the exchange API during development if not necessary and given its limitation of calls per minute is annoying at it often throws errors on server reload.
			return;
		}

		// Start the worker on the build-time fallback flag straight away so syncing
		// is not gated on the backend query. When the runtime value resolves, the
		// `$effect` below picks up the new `backendExchangeEnabled` and restarts
		// the timer with the correct cadence and source.
		worker = await ExchangeWorker.init();

		void loadBackendExchangeEnabled().then((enabled) => {
			backendExchangeEnabled = enabled;
		});
	});

	onDestroy(() => worker?.destroy());

	const syncTimer = () => {
		worker?.stopExchangeTimer();
		worker?.startExchangeTimer({
			currentCurrency: $currentCurrency,
			erc20Addresses: $enabledMergedErc20TokensAddresses,
			icrcCanisterIds: $enabledIcrcLedgerCanisterIdsNoCk,
			splAddresses: $enabledSplTokenAddresses,
			erc4626TokensExchangeData: $erc4626TokensExchangeData,
			backendExchangeEnabled
		});
	};

	const debounceSyncTimer = debounce(syncTimer, 1000);

	$effect(() => {
		[
			worker,
			backendExchangeEnabled,
			$authIdentity,
			$currentCurrency,
			$enabledMergedErc20TokensAddresses,
			$enabledIcrcLedgerCanisterIdsNoCk,
			$enabledSplTokenAddresses,
			$erc4626TokensExchangeData
		];

		debounceSyncTimer();
	});
</script>
