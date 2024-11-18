<script lang="ts">
	import { debounce, isNullish } from '@dfinity/utils';
	import { ETHERSCAN_MAX_CALLS_PER_SECOND } from '$env/rest/etherscan.env';
	import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
	import { loadEthereumTransactions } from '$eth/services/eth-transactions.services';
	import { enabledErc20Tokens } from '$lib/derived/tokens.derived';
	import type { TokenId } from '$lib/types/token';

	// TODO: make it more functional
	let tokensLoaded: TokenId[] = [];

	const load = async () => {
		if (isNullish($enabledEthereumTokens) || isNullish($enabledErc20Tokens)) {
			return;
		}

		const tokensToLoad = [...$enabledEthereumTokens, ...$enabledErc20Tokens].filter(
			({ id }) => !tokensLoaded.includes(id)
		);

		const promisesBuckets = tokensToLoad.reduce<(() => Promise<void>)[][]>(
			(acc, { network: { id: networkId }, id: tokenId }, index) => {
				const bucketIndex = Math.floor(index / ETHERSCAN_MAX_CALLS_PER_SECOND);
				acc[bucketIndex] = [
					...(acc[bucketIndex] ?? []),
					async () => {
						await loadEthereumTransactions({ tokenId, networkId });
						tokensLoaded.push(tokenId);
					}
				];
				return acc;
			},
			[]
		);

		for (const promises of promisesBuckets) {
			await Promise.allSettled(promises.map((promise) => promise()));
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
	};

	const debounceLoad = debounce(load, 1000);

	$: $enabledEthereumTokens, $enabledErc20Tokens, debounceLoad();
</script>

<slot />
