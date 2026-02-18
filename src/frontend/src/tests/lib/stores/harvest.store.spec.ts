import { harvestVaultsStore } from '$lib/stores/harvest.store';
import type { HarvestVault } from '$lib/types/harvest';
import { get } from 'svelte/store';

vi.mock('$env/tokens/tokens.erc4626.env', () => ({
	ERC4626_TOKENS: [{ address: '0xKnownVault1' }, { address: '0xKnownVault2' }]
}));

describe('harvest.store', () => {
	const mockVault = (overrides: Partial<HarvestVault> = {}): HarvestVault => ({
		id: 'vault-1',
		vaultAddress: '0xKnownVault1',
		estimatedApy: '5.5',
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
			'0xKnownVault1': { estimatedApy: '5.50' }
		});
	});

	it('should set multiple known vaults', () => {
		harvestVaultsStore.set([
			mockVault({ vaultAddress: '0xKnownVault1', estimatedApy: '5.5' }),
			mockVault({ vaultAddress: '0xKnownVault2', estimatedApy: '12.3' })
		]);

		expect(get(harvestVaultsStore)).toEqual({
			'0xKnownVault1': { estimatedApy: '5.50' },
			'0xKnownVault2': { estimatedApy: '12.3' }
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
			'0xknownvault1': { estimatedApy: '5.50' }
		});
	});

	it('should reset the store', () => {
		harvestVaultsStore.set([mockVault()]);

		expect(get(harvestVaultsStore)).not.toEqual({});

		harvestVaultsStore.reset();

		expect(get(harvestVaultsStore)).toEqual({});
	});
});
