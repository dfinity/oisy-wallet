<script lang="ts">
	import { debounce, isNullish } from '@dfinity/utils';
	import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
	import { loadErc20Balances, loadEthBalances } from '$eth/services/eth-balance.services';
	import { ethAddress } from '$lib/derived/address.derived';
	import { enabledErc20Tokens } from '$lib/derived/tokens.derived';

	const load = async () => {
		if (isNullish($ethAddress)) {
			return;
		}

		await Promise.allSettled([
			// We might require Ethereum balance on IC network as well given that one can convert ckETH to ETH.
			loadEthBalances($enabledEthereumTokens),
			loadErc20Balances({
				address: $ethAddress,
				erc20Tokens: $enabledErc20Tokens
			})
		]);
	};

	const debounceLoad = debounce(load, 500);

	$: $ethAddress, $enabledErc20Tokens, debounceLoad();
</script>

<slot />
