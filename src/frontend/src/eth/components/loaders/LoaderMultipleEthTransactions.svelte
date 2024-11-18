<script lang="ts">
	import { debounce, isNullish } from '@dfinity/utils';
	import { ETHERSCAN_MAX_CALLS_PER_SECOND } from '$env/rest/etherscan.env';
	import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
	import { batchLoadEthereumTransactions } from '$eth/services/eth-transactions.services';
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

		const loader = batchLoadEthereumTransactions({
			tokensToLoad,
			tokensLoaded,
			maxCallsPerSecond: ETHERSCAN_MAX_CALLS_PER_SECOND
		});

		for await (const _ of loader) {
			// The `yield` in the generator allows for asynchronous control flow
		}
	};

	const debounceLoad = debounce(load, 1000);

	$: $enabledEthereumTokens, $enabledErc20Tokens, debounceLoad();
</script>

<slot />
