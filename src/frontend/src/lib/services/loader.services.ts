import { loadBalances } from '$lib/services/balance.services';
import { loadTransactions as loadTransactionsServices } from '$lib/services/transactions.services';
import { nonNullish } from '@dfinity/utils';

export const loadEthData = async ({
	loadTransactions
}: {
	loadTransactions: boolean;
}): Promise<{ success: boolean }> => {
	const promises = [loadBalances(), ...(loadTransactions ? [loadTransactionsServices()] : [])];

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
