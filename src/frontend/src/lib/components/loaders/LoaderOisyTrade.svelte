<script lang="ts">
	import { anyTradingProviderEnabled } from '$env/trading';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { loadOisyTrade } from '$lib/services/oisy-trade.services';

	// Loads the DEX pairs, supported tokens, balances and orders app-wide (e.g. the
	// hero net worth, which counts deposited balances) without visiting the Trading
	// tab or the OISY Trade page first. Reactive on the identity.
	$effect(() => {
		if (!anyTradingProviderEnabled) {
			return;
		}

		loadOisyTrade({ identity: $authIdentity });
	});
</script>
