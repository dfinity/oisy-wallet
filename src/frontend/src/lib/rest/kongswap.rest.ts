import { KONGSWAP_API_URL } from '$env/rest/kongswap.env';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import type { KongSwapToken } from '$lib/types/kongswap';
import { nonNullish } from '@dfinity/utils';

const fetchKongSwap = async <T>(endpoint: string): Promise<T | null> => {
	const response = await fetch(`${KONGSWAP_API_URL}/${endpoint}`, {
		method: 'GET',
		headers: { 'Content-Type': 'application/json' }
	});

	if (!response.ok) {
		throw new Error('Fetching KongSwap failed.');
	}

	return response.json();
};

export const getKongSwapTokenById = (id: LedgerCanisterIdText): Promise<KongSwapToken | null> =>
	fetchKongSwap<KongSwapToken>(`tokens/${id.toLowerCase()}`);

export const fetchBatchKongSwapPrices = async (
	canisterIds: LedgerCanisterIdText[]
): Promise<KongSwapToken[]> => {
	const results = await Promise.allSettled(canisterIds.map(getKongSwapTokenById));

	return results.reduce<KongSwapToken[]>((acc, result) => {
		if (result.status === 'fulfilled' && nonNullish(result.value)) {
			acc.push(result.value);
		}
		return acc;
	}, []);
};
