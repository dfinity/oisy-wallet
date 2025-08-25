import { ETHERSCAN_MAX_CALLS_PER_SECOND } from '$env/rest/etherscan.env';
import { loadEthereumTransactions } from '$eth/services/eth-transactions.services';
import { batch } from '$lib/services/batch.services';
import type { Token, TokenId } from '$lib/types/token';
import type { ResultSuccess } from '$lib/types/utils';

export type ResultByToken = ResultSuccess & { tokenId: TokenId };

type PromiseResult = Promise<ResultByToken>;

export const batchLoadTransactions = ({
	tokens,
	tokensAlreadyLoaded
}: {
	tokens: Token[];
	tokensAlreadyLoaded: TokenId[];
}): AsyncGenerator<PromiseSettledResult<ResultByToken>[]> => {
	const promises = tokens.reduce<(() => Promise<ResultByToken>)[]>(
		(acc, { network: { id: networkId }, id: tokenId, standard }) => {
			if (tokensAlreadyLoaded.includes(tokenId)) {
				return acc;
			}

			const promise = async (): PromiseResult => {
				const result = await loadEthereumTransactions({ tokenId, networkId, standard });
				return { ...result, tokenId };
			};

			return [...acc, promise];
		},
		[]
	);

	return batch<ResultByToken>({
		promises,
		batchSize: ETHERSCAN_MAX_CALLS_PER_SECOND
	});
};

export const batchResultsToTokenId = (results: PromiseSettledResult<ResultByToken>[]): TokenId[] =>
	results.reduce<TokenId[]>((acc, result) => {
		if (result.status === 'rejected') {
			return acc;
		}

		if (!result.value.success) {
			return acc;
		}

		return [...acc, result.value.tokenId];
	}, []);
