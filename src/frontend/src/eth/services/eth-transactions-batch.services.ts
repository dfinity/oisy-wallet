import { loadEthereumTransactions } from '$eth/services/eth-transactions.services';
import { batchPromisesPerSecond } from '$lib/services/batch.services';
import type { Token, TokenId } from '$lib/types/token';

export const batchLoadEthereumTransactions = async function* ({
	tokensToLoad,
	tokensLoaded,
	maxCallsPerSecond
}: {
	tokensToLoad: Token[];
	tokensLoaded: TokenId[];
	maxCallsPerSecond: number;
}): AsyncGenerator<void> {
	yield* batchPromisesPerSecond({
		items: tokensToLoad,
		maxCallsPerSecond,
		promise: async ({ network: { id: networkId }, id: tokenId }: Token) => {
			const result = await loadEthereumTransactions({ tokenId, networkId });
			if (result.success) {
				tokensLoaded.push(tokenId);
			}
		},
		validate: ({ id: tokenId }: Token) => tokensLoaded.includes(tokenId)
	});
};
