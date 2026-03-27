import { harvestVaultsStore } from '$lib/stores/harvest.store';
import type { HarvestVault } from '$lib/types/harvest';
import { get } from 'svelte/store';

vi.mock('$eth/constants/harvest-autopilots.constants', () => ({
	HARVEST_AUTOPILOT_ADDRESSES: ['0xknownvault1', '0xknownvault2']
}));

describe('harvest.store', () => {
	const mockVault = (overrides: Partial<HarvestVault> = {}): HarvestVault => ({
		id: 'vault-1',
		vaultAddress: '0xKnownVault1',
		estimatedApy: '5.5',
		totalValueLocked: '184665.22626877529493613114',
		...overrides
	});

	beforeEach(() => {
		harvestVaultsStore.reset();
	});

	it('should have empty default value', () => {
		expect(get(harvestVaultsStore)).toEqual({});
	});

	it('should set vault data for known addresses', () => {
		harvestVaultsStore.set([mockVault()]);

		expect(get(harvestVaultsStore)).toEqual({
			'0xknownvault1': {
				estimatedApy: '5.50',
				totalValueLocked: '184665.22626877529493613114'
			}
		});
	});

	it('should set multiple known vaults', () => {
		harvestVaultsStore.set([
			mockVault({ vaultAddress: '0xKnownVault1', estimatedApy: '5.5' }),
			mockVault({ vaultAddress: '0xKnownVault2', estimatedApy: '12.3' })
		]);

		expect(get(harvestVaultsStore)).toEqual({
			'0xknownvault1': {
				estimatedApy: '5.50',
				totalValueLocked: '184665.22626877529493613114'
			},
			'0xknownvault2': {
				estimatedApy: '12.3',
				totalValueLocked: '184665.22626877529493613114'
			}
		});
	});

	it('should ignore vaults with unknown addresses', () => {
		harvestVaultsStore.set([mockVault({ vaultAddress: '0xUnknownAddress' })]);

		expect(get(harvestVaultsStore)).toEqual({});
	});

	it('should ignore vaults with nullish estimatedApy', () => {
		harvestVaultsStore.set([
			mockVault({ estimatedApy: null }),
			mockVault({ estimatedApy: undefined })
		]);

		expect(get(harvestVaultsStore)).toEqual({});
	});

	it('should match addresses case-insensitively', () => {
		harvestVaultsStore.set([mockVault({ vaultAddress: '0xknownvault1' })]);

		expect(get(harvestVaultsStore)).toEqual({
			'0xknownvault1': {
				estimatedApy: '5.50',
				totalValueLocked: '184665.22626877529493613114'
			}
		});
	});

	it('should reset the store', () => {
		harvestVaultsStore.set([mockVault()]);

		expect(get(harvestVaultsStore)).not.toEqual({});

		harvestVaultsStore.reset();

		expect(get(harvestVaultsStore)).toEqual({});
	});
});
