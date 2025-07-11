// import { VELORA_API_URL } from '$env/rest/velora.env';
// import type { LedgerCanisterIdText } from '$icp/types/canister';
// import { KongSwapTokenSchema, type KongSwapToken } from '$lib/types/kongswap';

// const fetchVelora = async <T>(endpoint: string): Promise<T | null> => {
// 	const response = await fetch(`${VELORA_API_URL}/${endpoint}`, {
// 		method: 'GET',
// 		headers: { 'Content-Type': 'application/json' }
// 	});

// 	if (!response.ok) {
// 		throw new Error('Fetching KongSwap failed.');
// 	}

// 	return response.json();
// };

// export const getVeloraTokensByNetwork = (network: number): Promise<KongSwapToken | null> =>
// 	fetchKongSwap<KongSwapToken>(`tokens/${id.toLowerCase()}`);

// export const fetchBatchKongSwapPrices = async (
// 	canisterIds: LedgerCanisterIdText[]
// ): Promise<KongSwapToken[]> => {
// 	const results = await Promise.allSettled(canisterIds.map(getKongSwapTokenById));

// 	return results.reduce<KongSwapToken[]>((acc, result) => {
// 		if (result.status !== 'fulfilled') {
// 			return acc;
// 		}

// 		const parsed = KongSwapTokenSchema.safeParse(result.value);
// 		if (!parsed.success) {
// 			return acc;
// 		}

// 		acc.push(parsed.data);
// 		return acc;
// 	}, []);
// };
