import { HARVEST_API_URL } from '$env/rest/harvest.env';
import {
	HarvestVaultsResponseSchema,
	type HarvestVault,
	type HarvestVaultsResponse
} from '$lib/types/harvest';

const fetchHarvest = async <T>({ endpointPath }: { endpointPath: string }): Promise<T> => {
	const response = await fetch(`${HARVEST_API_URL}/${endpointPath}`, {
		method: 'GET',
		headers: { 'Content-Type': 'application/json' }
	});

	if (!response.ok) {
		throw new Error('Fetching Harvest failed.');
	}

	return response.json();
};

export const fetchHarvestVaults = async (): Promise<HarvestVault[]> => {
	const data = await fetchHarvest<HarvestVaultsResponse>({
		endpointPath: 'vaults?key=harvest-key'
	});

	const { eth, arbitrum, base } = data;

	const parsed = HarvestVaultsResponseSchema.safeParse({ eth, arbitrum, base });

	if (!parsed.success) {
		throw new Error('Invalid Harvest vaults response.');
	}

	return [
		...Object.values(parsed.data.eth ?? {}),
		...Object.values(parsed.data.arbitrum ?? {}),
		...Object.values(parsed.data.base ?? {})
	];
};
