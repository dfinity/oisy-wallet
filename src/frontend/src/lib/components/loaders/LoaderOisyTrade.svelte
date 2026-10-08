<script lang="ts">
	import { OISY_TRADE_ENABLED } from '$env/oisy-trade';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { loadOisyTradeBalances } from '$lib/services/oisy-trade.services';

	// Loads the DEX balances app-wide, so the hero net worth counts deposited
	// assets without visiting the Trading tab or the OISY Trade page first.
	// Reactive on the identity. Balances are all the hero reads — pairs, supported
	// tokens and the order history stay with the page-level loaders, which fetch
	// them through the full `loadOisyTrade`.
	//
	// Gated on the provider flag rather than the `anyTradingProviderEnabled`
	// aggregate: this only ever talks to the OISY Trade canister, so it must stay
	// off when that provider is, even with the Trading surface kept reachable by
	// another one — the same split `TradingList` and `OisyTradeProvider` make.
	$effect(() => {
		if (!OISY_TRADE_ENABLED) {
			return;
		}

		loadOisyTradeBalances({ identity: $authIdentity });
	});
</script>
