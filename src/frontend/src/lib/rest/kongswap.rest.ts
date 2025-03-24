import { KONGSWAP_API_URL } from '$env/rest/kongswap.env';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import type { KongSwapToken } from '$lib/types/kongswap';

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

export const fetchBatchKongSwapPrices = (
	canisterIds: LedgerCanisterIdText[]
): Promise<(KongSwapToken | null)[]> =>
	Promise.all(
		canisterIds.map((id) =>
			getKongSwapTokenById(id).catch((error) => {
				console.warn(`KongSwap fallback failed for ${id}`, error);
				return null;
			})
		)
	);
