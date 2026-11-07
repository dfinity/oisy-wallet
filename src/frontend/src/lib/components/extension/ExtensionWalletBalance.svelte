<script lang="ts">
	import ExtensionWalletTotal from '$lib/components/extension/ExtensionWalletTotal.svelte';
	import {
		noPositiveBalanceAndNotAllBalancesZero,
		providersUsdBalance
	} from '$lib/derived/balances.derived';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { enabledFungibleNetworkTokensUi } from '$lib/derived/network-tokens-ui.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { sumTotalUsdBalance } from '$lib/utils/tokens.utils';

	// The same sum as OISY's home total with all networks: every enabled token plus the value held
	// with providers. The panel selects no network.
	let usdTotal = $derived(
		sumTotalUsdBalance({
			tokens: $enabledFungibleNetworkTokensUi,
			providersUsdBalance: $providersUsdBalance
		})
	);
</script>

<ExtensionWalletTotal
	currency={$currentCurrency}
	exchangeRate={$currencyExchangeStore}
	label={$i18n.hero.text.available_balance}
	loading={$noPositiveBalanceAndNotAllBalancesZero}
	{usdTotal}
/>
