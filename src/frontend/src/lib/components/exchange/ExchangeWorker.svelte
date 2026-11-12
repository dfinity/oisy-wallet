<script lang="ts">
	import { debounce } from '@dfinity/utils';
	import { onDestroy, onMount } from 'svelte';
	import { BACKEND_EXCHANGE_ENABLED, EXCHANGE_DISABLED } from '$env/exchange.env';
	import { erc4626TokensExchangeData } from '$eth/derived/erc4626.derived';
	import { enabledIcrcLedgerCanisterIdsNoCk } from '$icp/derived/icrc.derived';
	import { enabledMergedErc20TokensAddresses } from '$icp-eth/derived/icrc-erc20.derived';
	import { MOBILE_SHELL } from '$lib/constants/mobile.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { loadBackendExchangeEnabled } from '$lib/services/backend-exchange-enabled.services';
	import { registerWalletRefresh } from '$lib/services/wallet-refresh.services';
	import { ExchangeWorker } from '$lib/services/worker.exchange.services';
	import { enabledSplTokenAddresses } from '$sol/derived/spl.derived';

	let worker = $state<ExchangeWorker | undefined>();
	let destroyed = false;
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
		const initializedWorker = await ExchangeWorker.init();
		if (destroyed) {
			initializedWorker.destroy();
			return;
		}
		worker = initializedWorker;

		void loadBackendExchangeEnabled().then((enabled) => {
			backendExchangeEnabled = enabled;
		});
	});

	onDestroy(() => {
		destroyed = true;
		worker?.destroy();
	});
	onMount(() =>
		MOBILE_SHELL
			? registerWalletRefresh({
					kind: 'prices',
					refresh: async (signal) => {
						if (EXCHANGE_DISABLED) {
							return;
						}
						if (!worker) {
							throw new Error('Prices are not ready');
						}
						await worker.refresh(signal);
					}
				})
			: undefined
	);

	const syncTimer = () => {
		if (destroyed) {
			return;
		}
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
		// Inputs that matter to both data sources (and the source toggle itself).
		[worker, backendExchangeEnabled, $authIdentity, $currentCurrency, $erc4626TokensExchangeData];

		// The token-list inputs only matter to the public-provider branch: in
		// backend mode the canister derives the caller's token set server-side
		// (see `fetchExchangeRatesFromBackend`), so a change here would restart
		// the worker and fire a redundant `get_exchange_rates` update for an
		// identical result. Reading them only in provider mode keeps them out of
		// this effect's dependency set when the backend cache is the source.
		if (!backendExchangeEnabled) {
			[
				$enabledMergedErc20TokensAddresses,
				$enabledIcrcLedgerCanisterIdsNoCk,
				$enabledSplTokenAddresses
			];
		}

		debounceSyncTimer();
	});
</script>
