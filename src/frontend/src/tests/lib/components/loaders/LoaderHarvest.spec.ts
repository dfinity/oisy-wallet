import LoaderHarvest from '$lib/components/loaders/LoaderHarvest.svelte';
import * as harvestRest from '$lib/rest/harvest.rest';
import { harvestVaultsStore } from '$lib/stores/harvest.store';
import type { HarvestVault } from '$lib/types/harvest';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

vi.mock('$eth/constants/harvest-autopilots.constants', () => ({
	HARVEST_AUTOPILOT_ADDRESSES: ['0xvaultaddress']
}));

let earningEnabled = true;
vi.mock('$env/earning', () => ({
	get EARNING_ENABLED() {
		return earningEnabled;
	}
}));

const mockVault: HarvestVault = {
	id: 'vault-1',
	vaultAddress: '0xVaultAddress',
	estimatedApy: '4.25',
	totalValueLocked: '100000.50'
};

describe('LoaderHarvest', () => {
	beforeEach(() => {
		vi.resetAllMocks();

		harvestVaultsStore.reset();
		earningEnabled = true;
	});

	describe('when earning is enabled', () => {
		it('should fetch and set harvest vaults on mount', async () => {
			const spy = vi.spyOn(harvestRest, 'fetchHarvestVaults').mockResolvedValueOnce([mockVault]);

			render(LoaderHarvest);

			await waitFor(() => {
				expect(spy).toHaveBeenCalledOnce();
			});

			await waitFor(() => {
				expect(get(harvestVaultsStore)).toEqual({
					'0xvaultaddress': { estimatedApy: '4.25', totalValueLocked: '100000.50' }
				});
			});
		});

		it('should handle fetch errors gracefully', async () => {
			const error = new Error('Network error');
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			vi.spyOn(harvestRest, 'fetchHarvestVaults').mockRejectedValueOnce(error);

			render(LoaderHarvest);

			await waitFor(() => {
				expect(consoleSpy).toHaveBeenCalledWith('Failed to load Harvest vaults.', error);
			});

			expect(get(harvestVaultsStore)).toEqual({});
		});
	});

	describe('when earning is disabled', () => {
		beforeEach(() => {
			earningEnabled = false;
		});

		it('should not fetch harvest vaults', () => {
			const spy = vi.spyOn(harvestRest, 'fetchHarvestVaults');

			render(LoaderHarvest);

			expect(spy).not.toHaveBeenCalled();
		});
	});
});
