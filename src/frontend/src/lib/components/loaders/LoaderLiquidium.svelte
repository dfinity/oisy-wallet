<script lang="ts">
	import { anyLendBorrowProviderEnabled } from '$env/lend-borrow';
	import { ethAddress } from '$lib/derived/address.derived';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { loadLiquidium } from '$lib/services/liquidium.services';

	// Loads Liquidium markets + portfolio app-wide (e.g. the Earn-page card) without
	// visiting the provider page first. Reactive on identity / ETH address.
	$effect(() => {
		if (!anyLendBorrowProviderEnabled) {
			return;
		}

		loadLiquidium({ identity: $authIdentity, ethAddress: $ethAddress });
	});
</script>
