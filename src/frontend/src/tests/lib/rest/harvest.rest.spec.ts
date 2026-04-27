import { HARVEST_API_URL } from '$env/rest/harvest.env';
import { fetchHarvestVaults } from '$lib/rest/harvest.rest';

const EXPECTED_ENDPOINT = `${HARVEST_API_URL}/vaults?key=harvest-key`;

const mockVault = (overrides: Record<string, string | null> = {}) => ({
	id: 'vault-1',
	vaultAddress: '0xabc123',
	estimatedApy: '5.5',
	...overrides
});

describe('Harvest REST client', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	global.fetch = vi.fn();

	describe('fetchHarvestVaults', () => {
		it('fetches and returns vaults from all networks', async () => {
			const ethVault = mockVault({ id: 'eth-1', vaultAddress: '0xeth' });
			const arbVault = mockVault({ id: 'arb-1', vaultAddress: '0xarb' });
			const baseVault = mockVault({ id: 'base-1', vaultAddress: '0xbase' });

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						eth: { 'eth-1': ethVault },
						arbitrum: { 'arb-1': arbVault },
						base: { 'base-1': baseVault }
					})
			});

			const result = await fetchHarvestVaults();

			expect(fetch).toHaveBeenCalledWith(EXPECTED_ENDPOINT, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' }
			});
			expect(result).toEqual([ethVault, arbVault, baseVault]);
		});

		it('returns vaults only from networks that have data', async () => {
			const ethVault = mockVault({ id: 'eth-1' });

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						eth: { 'eth-1': ethVault },
						arbitrum: {},
						base: {}
					})
			});

			const result = await fetchHarvestVaults();

			expect(result).toEqual([ethVault]);
		});

		it('throws when fetch response is not ok', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false
			});

			await expect(fetchHarvestVaults()).rejects.toThrow('Fetching Harvest failed.');
		});

		it('throws when response fails Zod validation', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						eth: { 'vault-1': { id: 123, vaultAddress: null } }
					})
			});

			await expect(fetchHarvestVaults()).rejects.toThrow('Invalid Harvest vaults response.');
		});

		it('returns an empty array when all networks are empty', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						eth: {},
						arbitrum: {},
						base: {}
					})
			});

			const result = await fetchHarvestVaults();

			expect(result).toEqual([]);
		});
	});
});
