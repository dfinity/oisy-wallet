import { loadEthereumTransactions } from '$eth/services/eth-transactions.services';
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
	for (let i = 0; i < tokensToLoad.length; i += maxCallsPerSecond) {
		const batch = tokensToLoad.slice(i, i + maxCallsPerSecond);

		const batchPromises = batch.map(({ network: { id: networkId }, id: tokenId }) => async () => {
			if (!tokensLoaded.includes(tokenId)) {
				const result = await loadEthereumTransactions({ tokenId, networkId });
				if (result.success) {
					tokensLoaded.push(tokenId);
				}
			}
		});

		await Promise.allSettled(batchPromises.map((fn) => fn()));
		yield;
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}
};
