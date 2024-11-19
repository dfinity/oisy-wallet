<script lang="ts">
	import { debounce, isNullish } from '@dfinity/utils';
	import { ETHERSCAN_MAX_CALLS_PER_SECOND } from '$env/rest/etherscan.env';
	import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
	import { loadEthereumTransactions } from '$eth/services/eth-transactions.services';
	import { mapLoadTransactionsPromises, type ResultByToken } from '$eth/utils/transactions.utils';
	import { enabledErc20Tokens } from '$lib/derived/tokens.derived';
	import { batch } from '$lib/services/batch.services';
	import type { TokenId } from '$lib/types/token';
	import type { ResultSuccess } from '$lib/types/utils';

	// TODO: make it more functional
	let tokensAlreadyLoaded: TokenId[] = [];

	const load = async () => {
		if (isNullish($enabledEthereumTokens) || isNullish($enabledErc20Tokens)) {
			return;
		}

		const promises = mapLoadTransactionsPromises({
			tokens: [...$enabledEthereumTokens, ...$enabledErc20Tokens],
			tokensAlreadyLoaded
		});

		const loader = batch<ResultByToken>({
			promises,
			batchSize: ETHERSCAN_MAX_CALLS_PER_SECOND
		});

		for await (const results of loader) {
			tokensAlreadyLoaded = results.reduce<TokenId[]>(
				(acc, result) => {
					if (result.status === 'fulfilled' && result.value.success) {
						return [...acc, result.value.tokenId];
					}
					return acc;
				},
				[...tokensAlreadyLoaded]
			);
		}
	};

	const debounceLoad = debounce(load, 1000);

	$: $enabledEthereumTokens, $enabledErc20Tokens, debounceLoad();
</script>

<slot />
