import { loadBalances } from '$lib/services/balance.services';
import { loadTransactions as loadTransactionsServices } from '$lib/services/transactions.services';
import type { TokenId } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';

export const loadEthData = async ({
	loadTransactions,
	tokenId
}: {
	loadTransactions: boolean;
	tokenId: TokenId;
}): Promise<{ success: boolean }> => {
	const promises = [
		loadBalances(),
		...(loadTransactions ? [loadTransactionsServices(tokenId)] : [])
	];

	const results = await Promise.allSettled(promises);

	const isFulfilled = <T>(p: PromiseSettledResult<T>): p is PromiseFulfilledResult<T> =>
		p.status === 'fulfilled';
	const isRejected = <T>(p: PromiseSettledResult<T>): p is PromiseRejectedResult =>
		p.status === 'rejected';

	if (nonNullish(results.find(isRejected))) {
		return { success: false };
	}

	const fulfilledValues = results.filter(isFulfilled).map((p) => p.value);

	if (nonNullish(fulfilledValues.find(({ success }) => success === false))) {
		return { success: false };
	}

	return { success: true };
};
