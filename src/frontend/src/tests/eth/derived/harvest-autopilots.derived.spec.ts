import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { erc4626Tokens } from '$eth/derived/erc4626.derived';
import {
	disabledHarvestAutopilotTokens,
	enabledHarvestAutopilotsUsdBalance,
	harvestAutopilots,
	harvestAutopilotsCurrentEarning,
	harvestAutopilotsMaxApy,
	harvestAutopilotsUsdBalance,
	harvestAutopilotTokens
} from '$eth/derived/harvest-autopilots.derived';
import type { Erc4626CustomToken } from '$eth/types/erc4626-custom-token';
import { harvestVaultsStore } from '$lib/stores/harvest.store';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidErc4626Token } from '$tests/mocks/erc4626-tokens.mock';
import { get } from 'svelte/store';

describe('harvest-autopilots.derived', () => {
	const mockHarvestAddress = '0x3151cee0cdb517c0e7db2b55ff5085e7d1809d90';

	const mockHarvestToken: Erc4626CustomToken = {
		...mockValidErc4626Token,
		id: parseTokenId('HarvestTokenId1'),
		network: ETHEREUM_NETWORK,
		address: mockHarvestAddress,
		enabled: true
	};

	const mockDisabledHarvestToken: Erc4626CustomToken = {
		...mockValidErc4626Token,
		id: parseTokenId('DisabledHarvestTokenId'),
		network: ETHEREUM_NETWORK,
		address: '0x31a421271414641cb5063b71594b642d2666db6b',
		enabled: false
	};

	const mockNonHarvestToken: Erc4626CustomToken = {
		...mockValidErc4626Token,
		id: parseTokenId('NonHarvestTokenId'),
		address: '0xnonharvestaddress',
		enabled: true
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

	describe('harvestAutopilotTokens', () => {
		it('should filter only harvest autopilot tokens from erc4626Tokens', () => {
			mockErc4626TokensStore([mockHarvestToken, mockNonHarvestToken]);

			const result = get(harvestAutopilotTokens);

			expect(result).toHaveLength(1);
			expect(result[0].address).toBe(mockHarvestAddress);
		});

		it('should return empty array when no harvest autopilot tokens exist', () => {
			mockErc4626TokensStore([mockNonHarvestToken]);

			expect(get(harvestAutopilotTokens)).toEqual([]);
		});
	});

	describe('disabledHarvestAutopilotTokens', () => {
		it('should return only disabled harvest autopilot tokens', () => {
			mockErc4626TokensStore([mockHarvestToken, mockDisabledHarvestToken]);

			const result = get(disabledHarvestAutopilotTokens);

			expect(result).toHaveLength(1);
			expect(result[0].enabled).toBeFalsy();
		});

		it('should return empty array when all harvest tokens are enabled', () => {
			mockErc4626TokensStore([mockHarvestToken]);

			expect(get(disabledHarvestAutopilotTokens)).toEqual([]);
		});
	});

	describe('harvestAutopilots', () => {
		it('should map tokens to vaults with apy and tvl from harvestVaultsStore', () => {
			mockErc4626TokensStore([mockHarvestToken]);

			harvestVaultsStore.set([
				{
					id: 'vault-1',
					vaultAddress: mockHarvestAddress,
					estimatedApy: '5.5',
					totalValueLocked: '1000000'
				}
			]);

			const result = get(harvestAutopilots);

			expect(result).toHaveLength(1);
			expect(result[0].apy).toBeDefined();
			expect(result[0].token.address).toBe(mockHarvestAddress);
		});

		it('should return undefined apy when vault is not in harvestVaultsStore', () => {
			mockErc4626TokensStore([mockHarvestToken]);

			const result = get(harvestAutopilots);

			expect(result).toHaveLength(1);
			expect(result[0].apy).toBeUndefined();
			expect(result[0].totalValueLocked).toBeUndefined();
		});
	});

	describe('harvestAutopilotsCurrentEarning', () => {
		it('should return 0 when there are no autopilots', () => {
			mockErc4626TokensStore([]);

			expect(get(harvestAutopilotsCurrentEarning)).toBe(0);
		});

		it('should return 0 when apy or usdBalance is nullish', () => {
			mockErc4626TokensStore([mockHarvestToken]);

			expect(get(harvestAutopilotsCurrentEarning)).toBe(0);
		});
	});

	describe('harvestAutopilotsMaxApy', () => {
		it('should return "0" when there are no autopilots', () => {
			mockErc4626TokensStore([]);

			expect(get(harvestAutopilotsMaxApy)).toBe('0');
		});
	});

	describe('harvestAutopilotsUsdBalance', () => {
		it('should return 0 when there are no autopilots', () => {
			mockErc4626TokensStore([]);

			expect(get(harvestAutopilotsUsdBalance)).toBe(0);
		});
	});

	describe('enabledHarvestAutopilotsUsdBalance', () => {
		it('should return 0 when there are no autopilots', () => {
			mockErc4626TokensStore([]);

			expect(get(enabledHarvestAutopilotsUsdBalance)).toBe(0);
		});

		it('should exclude disabled tokens from the balance sum', () => {
			mockErc4626TokensStore([mockDisabledHarvestToken]);

			expect(get(enabledHarvestAutopilotsUsdBalance)).toBe(0);
		});
	});
});
