<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { untrack } from 'svelte';
	import { authIdentity } from '$lib/derived/auth.derived';
	import {
		loadSwapSupportedTokens,
		reloadSolSwapSupportedTokens
	} from '$lib/services/swap-supported-tokens.services';
	import { swapSupportedTokensStore } from '$lib/stores/swap-supported-tokens.store';
	import { isNetworkIdSOLMainnet } from '$lib/utils/network.utils';
	import { splTokens } from '$sol/derived/spl.derived';

	$effect(() => {
		if (isNullish($authIdentity) || nonNullish($swapSupportedTokensStore)) {
			return;
		}

		try {
			untrack(() => loadSwapSupportedTokens({ identity: $authIdentity }));
		} catch (_: unknown) {
			// To avoid disrupting the user's flow, we really don't need to raise any errors
		}
	});

	// LI.FI's Solana source list is the Solana mainnet tokens known when it is read, and the default
	// and custom SPL tokens load after the swap lists do, or are added later. So the Solana lists are
	// read again whenever those tokens change, and once more when the swap lists have loaded, in case
	// they changed while the lists were loading.
	const solMainnetTokenAddresses = $derived(
		$splTokens
			.filter(({ network: { id } }) => isNetworkIdSOLMainnet(id))
			.map(({ address }) => address)
			.join()
	);

	const swapListsLoaded = $derived(nonNullish($swapSupportedTokensStore));

	$effect(() => {
		[solMainnetTokenAddresses];

		if (!swapListsLoaded) {
			return;
		}

		untrack(reloadSolSwapSupportedTokens);
	});
</script>
