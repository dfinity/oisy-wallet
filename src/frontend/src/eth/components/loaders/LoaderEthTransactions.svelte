<script lang="ts">
	import { tokenNotInitialized } from '$eth/derived/nav.derived';
	import { loadTransactions } from '$eth/services/transactions.services';
	import { tokenWithFallback } from '$lib/derived/token.derived';
	import type { TokenId } from '$lib/types/token';
	import { isNetworkIdEthereum } from '$lib/utils/network.utils';

	let tokenIdLoaded: TokenId | undefined = undefined;

	const load = async () => {
		if ($tokenNotInitialized) {
			tokenIdLoaded = undefined;
			return;
		}

		const {
			network: { id: networkId },
			id: tokenId
		} = $tokenWithFallback;

		// If user browser ICP transactions but switch token to Eth, due to the derived stores, the token can briefly be set to ICP while the navigation is not over.
		// This prevents the glitch load of ETH transaction with a token ID for ICP.
		if (!isNetworkIdEthereum(networkId)) {
			tokenIdLoaded = undefined;
			return;
		}

		// We don't reload the same token in a row.
		if (tokenIdLoaded === tokenId) {
			return;
		}

		tokenIdLoaded = tokenId;

		const { success } = await loadTransactions({ tokenId, networkId });

		if (!success) {
			tokenIdLoaded = undefined;
		}
	};

	$: $tokenWithFallback, $tokenNotInitialized, (async () => await load())();
</script>

<slot />
