<script lang="ts">
	import { debounce, isNullish } from '@dfinity/utils';
	import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
	import {
		batchLoadTransactions,
		batchResultsToTokenId
	} from '$eth/services/eth-transactions-batch.services';
	import { enabledErc20Tokens } from '$lib/derived/tokens.derived';
	import type { TokenId } from '$lib/types/token';

	// TODO: make it more functional
	let tokensAlreadyLoaded: TokenId[] = [];

	const load = async () => {
		if (isNullish($enabledEthereumTokens) || isNullish($enabledErc20Tokens)) {
			return;
		}

		const loader = batchLoadTransactions({
			tokens: [...$enabledEthereumTokens, ...$enabledErc20Tokens],
			tokensAlreadyLoaded
		});

		for await (const results of loader) {
			tokensAlreadyLoaded = [...tokensAlreadyLoaded, ...batchResultsToTokenId(results)];
		}
	};

	const debounceLoad = debounce(load, 1000);

	$: $enabledEthereumTokens, $enabledErc20Tokens, debounceLoad();
</script>

<slot />
