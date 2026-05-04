import { ICPSWAP_API_URL } from '$env/rest/icpswap.env';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import { IcpSwapResponseSchema } from '$lib/schema/icpswap.schema';
import type { IcpSwapToken } from '$lib/types/icpswap';
import { nonNullish } from '@dfinity/utils';

const fetchIcpSwap = async (endpoint: string): Promise<unknown> => {
	const response = await fetch(`${ICPSWAP_API_URL}/${endpoint}`, {
		method: 'GET',
		headers: { 'Content-Type': 'application/json' }
	});

	if (!response.ok) {
		throw new Error('Fetching ICPSwap failed.');
	}

	return response.json();
};

export const getIcpSwapTokenById = async (
	id: LedgerCanisterIdText
): Promise<IcpSwapToken | null> => {
	const raw = await fetchIcpSwap(`info/token/${id}`);

	const parsed = IcpSwapResponseSchema.safeParse(raw);

	if (!parsed.success) {
		return null;
	}

	return parsed.data.data;
};

export const fetchBatchIcpSwapPrices = async (
	canisterIds: LedgerCanisterIdText[]
): Promise<IcpSwapToken[]> => {
	const results = await Promise.allSettled(canisterIds.map(getIcpSwapTokenById));

	return results.reduce<IcpSwapToken[]>((acc, result) => {
		if (result.status === 'fulfilled' && nonNullish(result.value)) {
			acc.push(result.value);
		}

		return acc;
	}, []);
};
