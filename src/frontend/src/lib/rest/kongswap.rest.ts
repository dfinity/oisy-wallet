import { KONGSWAP_API_URL } from '$env/rest/kongswap.env';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import type { KongSwapToken, KongSwapTokens } from '$lib/types/kongswap';

const fetchKongSwap = async <T extends KongSwapTokens | KongSwapToken>({
	endpointPath
}: {
	endpointPath: string;
}): Promise<T | null> => {
	const response = await fetch(`${KONGSWAP_API_URL}/${endpointPath}`, {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json'
		}
	});

	if (!response.ok) {
		throw new Error('Fetching KongSwap failed.');
	}

	return response.json();
};

export const kongSwapTokenPrice = ({ id }: { id: string }): Promise<KongSwapToken | null> => {
	return fetchKongSwap({
		endpointPath: `tokens/${id}`
	});
};

export const fetchAllKongSwapPrices = async (
	ledgerCanisterIds: LedgerCanisterIdText[]
): Promise<(KongSwapToken | null)[]> => {
	return Promise.all(
		ledgerCanisterIds.map(async (canisterId) => {
			return await kongSwapTokenPrice({ id: canisterId.toLowerCase() });
		})
	);
};
