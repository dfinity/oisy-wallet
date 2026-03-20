import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { erc4626Tokens } from '$eth/derived/erc4626.derived';
import { allVaults } from '$eth/derived/vaults.derived';
import type { Erc4626CustomToken } from '$eth/types/erc4626-custom-token';
import { harvestVaultsStore } from '$lib/stores/harvest.store';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidErc4626Token } from '$tests/mocks/erc4626-tokens.mock';
import { get } from 'svelte/store';

vi.mock('$eth/constants/harvest-autopilots.constants', () => ({
	HARVEST_AUTOPILOT_ADDRESSES: ['0xtokena', '0xtokenb', '0xdisabledtoken', '0xabcdef']
}));

describe('vaults.derived', () => {
	const mockTokenA: Erc4626CustomToken = {
		...mockValidErc4626Token,
		id: parseTokenId('VaultTokenA'),
		network: ETHEREUM_NETWORK,
		address: '0xTokenA',
		enabled: true
	};

	const mockTokenB: Erc4626CustomToken = {
		...mockValidErc4626Token,
		id: parseTokenId('VaultTokenB'),
		network: ETHEREUM_NETWORK,
		address: '0xTokenB',
		enabled: true
	};

	const mockDisabledToken: Erc4626CustomToken = {
		...mockValidErc4626Token,
		id: parseTokenId('DisabledVaultToken'),
		network: ETHEREUM_NETWORK,
		address: '0xDisabledToken',
		enabled: false
	};

	const mockErc4626TokensStore = (tokens: Erc4626CustomToken[]) => {
		vi.spyOn(erc4626Tokens, 'subscribe').mockImplementation((fn) => {
			fn(tokens);
			return () => {};
		});
	};

	beforeEach(() => {
		vi.resetAllMocks();
		harvestVaultsStore.reset();
	});

	describe('allVaults', () => {
		it('should return empty array when no ERC4626 tokens exist', () => {
			mockErc4626TokensStore([]);

			expect(get(allVaults)).toEqual([]);
		});

		it('should map all ERC4626 tokens to vaults', () => {
			mockErc4626TokensStore([mockTokenA, mockTokenB]);

			const result = get(allVaults);

			expect(result).toHaveLength(2);
			expect(result[0].token.address).toBe('0xTokenA');
			expect(result[1].token.address).toBe('0xTokenB');
		});

		it('should include disabled ERC4626 tokens', () => {
			mockErc4626TokensStore([mockTokenA, mockDisabledToken]);

			const result = get(allVaults);

			expect(result).toHaveLength(2);
			expect(result[1].token.enabled).toBeFalsy();
		});

		it('should include apy from harvestVaultsStore when available', () => {
			mockErc4626TokensStore([mockTokenA]);

			harvestVaultsStore.set([
				{
					id: 'vault-a',
					vaultAddress: '0xTokenA',
					estimatedApy: '4.25',
					totalValueLocked: '500000'
				}
			]);

			const result = get(allVaults);

			expect(result).toHaveLength(1);
			expect(result[0].apy).toBe('4.25');
		});

		it('should return undefined apy when vault is not in harvestVaultsStore', () => {
			mockErc4626TokensStore([mockTokenA]);

			const result = get(allVaults);

			expect(result).toHaveLength(1);
			expect(result[0].apy).toBeUndefined();
		});

		it('should match vault by lowercase address', () => {
			const tokenWithUpperCase: Erc4626CustomToken = {
				...mockValidErc4626Token,
				id: parseTokenId('UpperCaseToken'),
				network: ETHEREUM_NETWORK,
				address: '0xAbCdEf',
				enabled: true
			};

			mockErc4626TokensStore([tokenWithUpperCase]);

			harvestVaultsStore.set([
				{
					id: 'vault-upper',
					vaultAddress: '0xabcdef',
					estimatedApy: '3.0',
					totalValueLocked: '100000'
				}
			]);

			const result = get(allVaults);

			expect(result[0].apy).toBe('3.00');
		});

		it('should map apy independently per token', () => {
			mockErc4626TokensStore([mockTokenA, mockTokenB]);

			harvestVaultsStore.set([
				{
					id: 'vault-a',
					vaultAddress: '0xTokenA',
					estimatedApy: '5.5',
					totalValueLocked: '1000000'
				}
			]);

			const result = get(allVaults);

			expect(result[0].apy).toBe('5.50');
			expect(result[1].apy).toBeUndefined();
		});
	});
});
