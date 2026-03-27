import { ETHERSCAN_MAX_CALLS_PER_SECOND } from '$env/rest/etherscan.env';
import { loadEthereumTransactions } from '$eth/services/eth-transactions.services';
import { batch } from '$lib/services/batch.services';
import type { OptionIdentity } from '$lib/types/identity';
import type { Token, TokenId } from '$lib/types/token';
import type { ResultSuccess } from '$lib/types/utils';
import { isNetworkEthereum } from '$lib/utils/network.utils';

export type ResultByToken = ResultSuccess & { tokenId: TokenId };

type PromiseResult = Promise<ResultByToken>;

export const batchLoadTransactions = ({
	identity,
	tokens
}: {
	identity: OptionIdentity;
	tokens: Token[];
}): AsyncGenerator<PromiseSettledResult<ResultByToken>[]> => {
	const promises = tokens.reduce<(() => Promise<ResultByToken>)[]>(
		(acc, { network, id: tokenId, standard }) => {
			if (!isNetworkEthereum(network)) {
				return acc;
			}

			const { id: networkId, chainId } = network;

			const promise = async (): PromiseResult => {
				const result = await loadEthereumTransactions({
					identity,
					tokenId,
					networkId,
					chainId,
					standard
				});

				return { ...result, tokenId };
			};

			acc.push(promise);

			return acc;
		},
		[]
	);

	return batch<ResultByToken>({
		promises,
		batchSize: ETHERSCAN_MAX_CALLS_PER_SECOND
	});
};
