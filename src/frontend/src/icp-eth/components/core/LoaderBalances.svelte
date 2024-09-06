<script lang="ts">
	import { loadBalances, loadErc20Balances } from '$eth/services/balance.services';
	import { ethAddress } from '$lib/derived/address.derived';
	import { debounce } from '@dfinity/utils';
	import { enabledErc20Tokens } from '$lib/derived/tokens.derived';

	const load = async () => {
		await Promise.allSettled([
			// We might require Ethereum balance on IC network as well given that one can convert ckETH to ETH.
			loadBalances(),
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
