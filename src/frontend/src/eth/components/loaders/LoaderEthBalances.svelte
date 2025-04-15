<script lang="ts">
	import { debounce } from '@dfinity/utils';
	import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
	import { loadErc20Balances, loadEthBalances } from '$eth/services/eth-balance.services';
	import { ethAddress } from '$lib/derived/address.derived';
	import { enabledErc20Tokens } from '$lib/derived/tokens.derived';
	import type { Snippet } from 'svelte';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();

	const load = async () => {
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

	$effect(() => {
		// To trigger the load function when any of the dependencies change.
		[$ethAddress, $enabledEthereumTokens, $enabledErc20Tokens];
		debounceLoad();
	});
</script>

{@render children?.()}
