import { ARBITRUM_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { erc4626Tokens } from '$eth/derived/erc4626.derived';
import {
	allHarvestAutopilots,
	allHarvestAutopilotsMaxApy,
	allHarvestAutopilotTokens,
	disabledHarvestAutopilotTokens,
	enabledHarvestAutopilotsUsdBalance,
	harvestAutopilots,
	harvestAutopilotsCurrentEarning,
	harvestAutopilotsMaxApy,
	harvestAutopilotsUsdBalance,
	harvestAutopilotTokens
} from '$eth/derived/harvest-autopilots.derived';
import { erc4626CustomTokensStore } from '$eth/stores/erc4626-custom-tokens.store';
import { erc4626DefaultTokensStore } from '$eth/stores/erc4626-default-tokens.store';
import type { Erc4626Token } from '$eth/types/erc4626';
import type { Erc4626CustomToken } from '$eth/types/erc4626-custom-token';
import { harvestVaultsStore } from '$lib/stores/harvest.store';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidErc4626Token } from '$tests/mocks/erc4626-tokens.mock';
import { get } from 'svelte/store';

describe('harvest-autopilots.derived', () => {
	const mockHarvestAddress = '0x0d877dc7c8fa3ad980dfdb18b48ec9f8768359c4';

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

	describe('all-harvest-autopilots (network-independent)', () => {
		const harvestAddressBase = mockHarvestAddress;
		const harvestAddressArbitrum = '0x407d3d942d0911a2fea7e22417f81e27c02d6c6f';

		const mockHarvestDefaultBaseToken: Erc4626Token = {
			...mockValidErc4626Token,
			id: parseTokenId('HarvestDefaultBaseTokenId'),
			network: BASE_NETWORK,
			address: harvestAddressBase
		};

		const mockHarvestDefaultArbitrumToken: Erc4626Token = {
			...mockValidErc4626Token,
			id: parseTokenId('HarvestDefaultArbitrumTokenId'),
			network: ARBITRUM_MAINNET_NETWORK,
			address: harvestAddressArbitrum
		};

		const mockHarvestCustomToken: Erc4626CustomToken = {
			...mockValidErc4626Token,
			id: parseTokenId('HarvestCustomTokenId'),
			network: ARBITRUM_MAINNET_NETWORK,
			address: harvestAddressArbitrum,
			enabled: false
		};

		beforeEach(() => {
			erc4626DefaultTokensStore.reset();
			erc4626CustomTokensStore.resetAll();
			harvestVaultsStore.reset();
		});

		describe('allHarvestAutopilotTokens', () => {
			it('should include default harvest tokens regardless of enabled networks', () => {
				erc4626DefaultTokensStore.set([
					mockHarvestDefaultBaseToken,
					mockHarvestDefaultArbitrumToken
				]);

				const result = get(allHarvestAutopilotTokens);

				expect(result).toHaveLength(2);
				expect(result.map(({ address }) => address)).toEqual(
					expect.arrayContaining([harvestAddressBase, harvestAddressArbitrum])
				);
			});

			it('should deduplicate custom tokens that overlap default tokens', () => {
				erc4626DefaultTokensStore.set([mockHarvestDefaultArbitrumToken]);
				erc4626CustomTokensStore.setAll([{ data: mockHarvestCustomToken, certified: false }]);

				expect(get(allHarvestAutopilotTokens)).toHaveLength(1);
			});

			it('should include custom harvest tokens without a matching default', () => {
				erc4626CustomTokensStore.setAll([{ data: mockHarvestCustomToken, certified: false }]);

				const result = get(allHarvestAutopilotTokens);

				expect(result).toHaveLength(1);
				expect(result[0].address).toBe(harvestAddressArbitrum);
			});

			it('should return empty array when no harvest tokens exist', () => {
				expect(get(allHarvestAutopilotTokens)).toEqual([]);
			});
		});

		describe('allHarvestAutopilots', () => {
			it('should include vaults regardless of enabled networks', () => {
				erc4626DefaultTokensStore.set([
					mockHarvestDefaultBaseToken,
					mockHarvestDefaultArbitrumToken
				]);

				expect(get(allHarvestAutopilots)).toHaveLength(2);
			});
		});

		describe('allHarvestAutopilotsMaxApy', () => {
			it('should return the max APY across all vaults', () => {
				erc4626DefaultTokensStore.set([
					mockHarvestDefaultBaseToken,
					mockHarvestDefaultArbitrumToken
				]);
				harvestVaultsStore.set([
					{
						id: 'vault-1',
						vaultAddress: harvestAddressBase,
						estimatedApy: '5.5',
						totalValueLocked: '1000000'
					},
					{
						id: 'vault-2',
						vaultAddress: harvestAddressArbitrum,
						estimatedApy: '9.25',
						totalValueLocked: '2000000'
					}
				]);

				expect(get(allHarvestAutopilotsMaxApy)).toBe('9.25');
			});

			it('should return "0" when there are no autopilots', () => {
				expect(get(allHarvestAutopilotsMaxApy)).toBe('0');
			});
		});
	});
});
