<script lang="ts">
	import { OISY_TRADE_ENABLED } from '$env/oisy-trade';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { loadOisyTrade } from '$lib/services/oisy-trade.services';

	// Loads the DEX pairs, supported tokens, balances and orders app-wide (e.g. the
	// hero net worth, which counts deposited balances) without visiting the Trading
	// tab or the OISY Trade page first. Reactive on the identity.
	//
	// Gated on the provider flag rather than the `anyTradingProviderEnabled`
	// aggregate: this only ever talks to the OISY Trade canister, so it must stay
	// off when that provider is, even with the Trading surface kept reachable by
	// another one — the same split `TradingList` and `OisyTradeProvider` make.
	$effect(() => {
		if (!OISY_TRADE_ENABLED) {
			return;
		}

		loadOisyTrade({ identity: $authIdentity });
	});
</script>
