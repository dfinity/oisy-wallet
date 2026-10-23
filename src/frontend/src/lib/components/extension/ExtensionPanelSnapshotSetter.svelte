<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { enabledIcrcLedgerCanisterIdsNoCk } from '$icp/derived/icrc.derived';
	import { enabledMergedErc20TokensAddresses } from '$icp-eth/derived/icrc-erc20.derived';
	import { OISY_EXTENSION_PANEL_SNAPSHOT_DELAY_MS } from '$lib/constants/extension.constants';
	import {
		noPositiveBalanceAndNotAllBalancesZero,
		providersUsdBalance
	} from '$lib/derived/balances.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { enabledFungibleNetworkTokensUi } from '$lib/derived/network-tokens-ui.derived';
	import { saveExtensionPanelSnapshot } from '$lib/services/extension-panel.services';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { exchangeStore } from '$lib/stores/exchange.store';
	import type { TokenUi } from '$lib/types/token-ui';
	import type { TokenUiOrGroupUi } from '$lib/types/token-ui-group';
	import {
		findExtensionPriceKey,
		toExtensionPanelSnapshotHolding,
		toExtensionPanelSnapshotRow
	} from '$lib/utils/extension.utils';
	import { sumTotalUsdBalance } from '$lib/utils/tokens.utils';
	import { enabledSplTokenAddresses } from '$sol/derived/spl.derived';

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

		const priceKeyOf = ({ id }: TokenUi): string | undefined =>
			findExtensionPriceKey({ price: $exchanges[id], prices: $exchangeStore });

		const holdings = $enabledFungibleNetworkTokensUi
			.map((token) => toExtensionPanelSnapshotHolding({ token, priceKey: priceKeyOf(token) }))
			.filter(nonNullish);

		// Only the held tokens' lookups are kept, so the snapshot says no more about the wallet than
		// it has to.
		const heldKeys = new Set(
			holdings.map(({ priceKey }) => priceKey?.toLowerCase()).filter(nonNullish)
		);

		const snapshot = {
			savedAt: Date.now(),
			// The same sum as the hero card's total.
			usdTotal: sumTotalUsdBalance({
				tokens: $enabledFungibleNetworkTokensUi,
				providersUsdBalance: $providersUsdBalance
			}),
			currency,
			exchangeRateToUsd,
			rows: rows.map((tokenOrGroup) => toExtensionPanelSnapshotRow({ tokenOrGroup, priceKeyOf })),
			holdings,
			providersUsd: $providersUsdBalance,
			prices: {
				erc20Addresses: $enabledMergedErc20TokensAddresses.filter(({ address }) =>
					heldKeys.has(address.toLowerCase())
				),
				icrcCanisterIds: $enabledIcrcLedgerCanisterIdsNoCk.filter((canisterId) =>
					heldKeys.has(canisterId.toLowerCase())
				),
				splAddresses: $enabledSplTokenAddresses.filter((address) =>
					heldKeys.has(address.toLowerCase())
				)
			}
		};

		const timer = setTimeout(
			() => saveExtensionPanelSnapshot(snapshot),
			OISY_EXTENSION_PANEL_SNAPSHOT_DELAY_MS
		);

		return () => clearTimeout(timer);
	});
</script>
