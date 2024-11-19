<script lang="ts">
	import { debounce, isNullish } from '@dfinity/utils';
	import { ETHERSCAN_MAX_CALLS_PER_SECOND } from '$env/rest/etherscan.env';
	import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
	import { loadEthereumTransactions } from '$eth/services/eth-transactions.services';
	import { enabledErc20Tokens } from '$lib/derived/tokens.derived';
	import { batch } from '$lib/services/batch.services';
	import type { TokenId } from '$lib/types/token';
	import type { ResultSuccess } from '$lib/types/utils';

	// TODO: make it more functional
	let tokensLoaded: TokenId[] = [];

	type ResultByToken = ResultSuccess & { tokenId: TokenId };
	type PromiseResult = Promise<ResultByToken>;

	const load = async () => {
		if (isNullish($enabledEthereumTokens) || isNullish($enabledErc20Tokens)) {
			return;
		}

		const promises = [...$enabledEthereumTokens, ...$enabledErc20Tokens].reduce<PromiseResult[]>(
			(acc, { network: { id: networkId }, id: tokenId }) => {
				if (!tokensLoaded.includes(tokenId)) {
					const promise = (async (): PromiseResult => {
						const result = await loadEthereumTransactions({ tokenId, networkId });
						return { ...result, tokenId };
					})();

					return [...acc, promise];
				}
				return acc;
			},
			[]
		);

		const loader = batch<ResultByToken>({
			promises,
			batchSize: ETHERSCAN_MAX_CALLS_PER_SECOND
		});

		for await (const results of loader) {
			tokensLoaded = results.reduce<TokenId[]>(
				(acc, result) => {
					if (result.status === 'fulfilled' && result.value.success) {
						return [...acc, result.value.tokenId];
					}
					return acc;
				},
				[...tokensLoaded]
			);
		}
	};

	const debounceLoad = debounce(load, 1000);

	$: $enabledEthereumTokens, $enabledErc20Tokens, debounceLoad();
</script>

<slot />
