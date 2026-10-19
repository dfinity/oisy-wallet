<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { OISY_EXTENSION_PANEL_SNAPSHOT_DELAY_MS } from '$lib/constants/extension.constants';
	import {
		noPositiveBalanceAndNotAllBalancesZero,
		providersUsdBalance
	} from '$lib/derived/balances.derived';
	import { enabledFungibleNetworkTokensUi } from '$lib/derived/network-tokens-ui.derived';
	import { saveExtensionPanelSnapshot } from '$lib/services/extension-panel.services';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import type { TokenUiOrGroupUi } from '$lib/types/token-ui-group';
	import { toExtensionPanelSnapshotRow } from '$lib/utils/extension.utils';
	import { sumTotalUsdBalance } from '$lib/utils/tokens.utils';

	interface Props {
		// The asset rows the panel shows.
		rows: TokenUiOrGroupUi[] | undefined;
	}

	let { rows }: Props = $props();

	// Keeps what the panel shows, so it can still show it after the session ends. Unmounting cancels a
	// pending write, which is how logging out from the panel keeps the snapshot from coming back.
	$effect(() => {
		const { currency, exchangeRateToUsd } = $currencyExchangeStore;

		// Same rule as OISY's hero: no balance yet and not all zero means still loading.
		if (
			isNullish(rows) ||
			$noPositiveBalanceAndNotAllBalancesZero ||
			isNullish(exchangeRateToUsd)
		) {
			return;
		}

		const snapshot = {
			savedAt: Date.now(),
			// The same sum as the hero card's total.
			usdTotal: sumTotalUsdBalance({
				tokens: $enabledFungibleNetworkTokensUi,
				providersUsdBalance: $providersUsdBalance
			}),
			currency,
			exchangeRateToUsd,
			rows: rows.map(toExtensionPanelSnapshotRow)
		};

		const timer = setTimeout(
			() => saveExtensionPanelSnapshot(snapshot),
			OISY_EXTENSION_PANEL_SNAPSHOT_DELAY_MS
		);

		return () => clearTimeout(timer);
	});
</script>
