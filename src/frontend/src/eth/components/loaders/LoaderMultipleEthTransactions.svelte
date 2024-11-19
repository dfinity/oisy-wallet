<script lang="ts">
	import { debounce, isNullish } from '@dfinity/utils';
	import { ETHERSCAN_MAX_CALLS_PER_SECOND } from '$env/rest/etherscan.env';
	import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
	import { enabledErc20Tokens } from '$lib/derived/tokens.derived';
	import type { TokenId } from '$lib/types/token';
	import { batchLoadEthereumTransactions } from '$eth/services/eth-transactions-batch.services';

	// TODO: make it more functional
	let tokensLoaded: TokenId[] = [];


	const load = async () => {
		if (isNullish($enabledEthereumTokens) || isNullish($enabledErc20Tokens)) {
			return;
		}

		const tokensToLoad = [...$enabledEthereumTokens, ...$enabledErc20Tokens].filter(
			({ id }) => !tokensLoaded.includes(id)
		);

		const loader = batchLoadEthereumTransactions({
			tokensToLoad,
			tokensLoaded,
			maxCallsPerSecond: ETHERSCAN_MAX_CALLS_PER_SECOND
		});

		for await (const _ of loader) {
			// This loop is just to wait for the loader to finish
		}
	};

	const debounceLoad = debounce(load, 1000);

	$: $enabledEthereumTokens, $enabledErc20Tokens, debounceLoad();
</script>

<slot />
