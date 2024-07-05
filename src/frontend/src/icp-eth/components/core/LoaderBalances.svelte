<script lang="ts">
	import { loadBalances, loadErc20Balances } from '$eth/services/balance.services';
	import { address } from '$lib/derived/address.derived';
	import { selectedNetwork } from '$lib/derived/network.derived';
	import { enabledErc20Tokens } from '$eth/derived/erc20.derived';
	import { debounce, nonNullish } from '@dfinity/utils';

	const load = async () => {
		await Promise.allSettled([
			// We might require Ethereum balance on IC network as well given that one can convert ckETH to ETH.
			loadBalances(),
			...[
				nonNullish($selectedNetwork?.id)
					? [
							loadErc20Balances({
								address: $address,
								erc20Tokens: $enabledErc20Tokens,
								networkId: $selectedNetwork.id
							})
						]
					: []
			]
		]);
	};

	const debounceLoad = debounce(load);

	$: $address, $enabledErc20Tokens, $selectedNetwork, debounceLoad();
</script>

<slot />
