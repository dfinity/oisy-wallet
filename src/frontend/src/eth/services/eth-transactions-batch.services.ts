import { ETHERSCAN_MAX_CALLS_PER_SECOND } from '$env/rest/etherscan.env';
import { loadEthereumTransactions } from '$eth/services/eth-transactions.services';
import type { NetworkChainId } from '$eth/types/network';
import { batch } from '$lib/services/batch.services';
import type { Token, TokenId } from '$lib/types/token';
import type { ResultSuccess } from '$lib/types/utils';

export type ResultByToken = ResultSuccess & { tokenId: TokenId };

type PromiseResult = Promise<ResultByToken>;

export const batchLoadTransactions = ({
	tokens
}: {
	tokens: Token[];
}): AsyncGenerator<PromiseSettledResult<ResultByToken>[]> => {
	const promises = tokens.reduce<(() => Promise<ResultByToken>)[]>(
		(acc, { network: { id: networkId }, id: tokenId, standard, network }) => {
			const { chainId } = network as unknown as NetworkChainId;

			const promise = async (): PromiseResult => {
				const result = await loadEthereumTransactions({
					tokenId,
					networkId,
					chainId,
					standard
				});
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
