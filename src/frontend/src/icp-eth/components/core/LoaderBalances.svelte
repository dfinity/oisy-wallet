<script lang="ts">
	import { debounce } from '@dfinity/utils';
	import { loadBalances, loadErc20Balances } from '$eth/services/balance.services';
	import { ethAddress } from '$lib/derived/address.derived';
	import { erc20Tokens } from '$eth/derived/erc20.derived';


	const load = async () => {
		await Promise.allSettled([
			// We might require Ethereum balance on IC network as well given that one can convert ckETH to ETH.
			loadBalances(),
			loadErc20Balances({
				address: $ethAddress,
				erc20Tokens: $erc20Tokens
			})
		]);
	};

	const debounceLoad = debounce(load, 500);

	$: $ethAddress, $erc20Tokens, debounceLoad();
</script>

<slot />
