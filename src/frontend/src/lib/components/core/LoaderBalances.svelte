<script lang="ts">
	import { loadBalances, loadErc20Balances } from '$eth/services/balance.services';
	import { address } from '$lib/derived/address.derived';
	import { networkEthereum, networkId } from '$lib/derived/network.derived';
	import { erc20Tokens } from '$eth/derived/erc20.derived';
	import { debounce } from '@dfinity/utils';

	const load = async () => {
		await Promise.allSettled([
			// We might require Ethereum balance on IC network as well given that one can convert ckETH to ETH.
			loadBalances(),
			...[
				$networkEthereum
					? [
							loadErc20Balances({
								address: $address,
								erc20Tokens: $erc20Tokens,
								networkId: $networkId
							})
						]
					: []
			]
		]);
	};

	const debounceLoad = debounce(load);

	$: $address, $erc20Tokens, $networkId, debounceLoad();
</script>

<slot />
