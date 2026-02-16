import { calculateErc4626Prices } from '$eth/services/erc4626-exchange.services';
import type { Erc4626TokensExchangeData } from '$eth/types/erc4626';
import type { CoingeckoSimpleTokenPriceResponse } from '$lib/types/coingecko';
import { Contract } from 'ethers/contract';

vi.mock('ethers/providers', () => {
	const provider = vi.fn();
	return { InfuraProvider: provider };
});

vi.mock('ethers/contract', () => {
	const contract = vi.fn();
	contract.prototype.convertToAssets = vi.fn();
	return { Contract: contract };
});

describe('erc4626-exchange.services', () => {
	describe('calculateErc4626Prices', () => {
		const mockContract = vi.mocked(Contract);
		const mockConvertToAssets = vi.fn();

		const mockExchangeData: Erc4626TokensExchangeData = {
			vaultAddress: '0xVaultAddress',
			vaultDecimals: 18,
			assetAddress: '0xAssetAddress',
			assetDecimals: 6,
			exchange: { coingeckoId: 'ethereum' },
			infura: 'mainnet'
		};

		const mockErc20Prices: CoingeckoSimpleTokenPriceResponse = {
			'0xassetaddress': { usd: 1.0, usd_market_cap: 1000000 }
		};

		beforeEach(() => {
			vi.clearAllMocks();

			mockContract.prototype.convertToAssets =
				mockConvertToAssets as unknown as typeof mockContract.prototype.convertToAssets;
			mockConvertToAssets.mockResolvedValue(1050000n);
		});

		it('should calculate vault price based on asset price and conversion rate', async () => {
			const result = await calculateErc4626Prices({
				erc20Prices: mockErc20Prices,
				erc4626TokensExchangeData: [mockExchangeData]
			});

			expect(result).toEqual({
				'0xvaultaddress': {
					usd: 1.05,
					usd_market_cap: 0
				}
			});
		});

		it('should call convertToAssets with one share (10^vaultDecimals)', async () => {
			await calculateErc4626Prices({
				erc20Prices: mockErc20Prices,
				erc4626TokensExchangeData: [mockExchangeData]
			});

			expect(mockConvertToAssets).toHaveBeenCalledWith(10n ** 18n);
		});

		it('should return empty results when erc4626TokensExchangeData is empty', async () => {
			const result = await calculateErc4626Prices({
				erc20Prices: mockErc20Prices,
				erc4626TokensExchangeData: []
			});

			expect(result).toEqual({});
		});

		it('should return empty results when erc20Prices is null', async () => {
			const result = await calculateErc4626Prices({
				erc20Prices: null,
				erc4626TokensExchangeData: [mockExchangeData]
			});

			expect(result).toEqual({});
		});

		it('should skip tokens with no coingeckoId', async () => {
			const result = await calculateErc4626Prices({
				erc20Prices: mockErc20Prices,
				erc4626TokensExchangeData: [{ ...mockExchangeData, exchange: undefined }]
			});

			expect(result).toEqual({});
			expect(mockConvertToAssets).not.toHaveBeenCalled();
		});

		it('should skip tokens whose asset price is not found in erc20Prices', async () => {
			const result = await calculateErc4626Prices({
				erc20Prices: { '0xotherasset': { usd: 2.0, usd_market_cap: 0 } },
				erc4626TokensExchangeData: [mockExchangeData]
			});

			expect(result).toEqual({});
			expect(mockConvertToAssets).not.toHaveBeenCalled();
		});

		it('should handle multiple vault tokens', async () => {
			const secondVault: Erc4626TokensExchangeData = {
				vaultAddress: '0xSecondVault',
				vaultDecimals: 8,
				assetAddress: '0xAssetAddress',
				assetDecimals: 6,
				exchange: { coingeckoId: 'ethereum' },
				infura: 'mainnet'
			};

			mockConvertToAssets.mockResolvedValueOnce(1050000n).mockResolvedValueOnce(2000000n);

			const result = await calculateErc4626Prices({
				erc20Prices: mockErc20Prices,
				erc4626TokensExchangeData: [mockExchangeData, secondVault]
			});

			expect(result).toEqual({
				'0xvaultaddress': { usd: 1.05, usd_market_cap: 0 },
				'0xsecondvault': { usd: 2.0, usd_market_cap: 0 }
			});
		});

		it('should handle contract call failure gracefully', async () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			mockConvertToAssets.mockRejectedValue(new Error('RPC error'));

			const result = await calculateErc4626Prices({
				erc20Prices: mockErc20Prices,
				erc4626TokensExchangeData: [mockExchangeData]
			});

			expect(result).toEqual({});
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('0xVaultAddress'),
				expect.any(Error)
			);

			consoleSpy.mockRestore();
		});

		it('should lowercase vault address in results', async () => {
			const result = await calculateErc4626Prices({
				erc20Prices: mockErc20Prices,
				erc4626TokensExchangeData: [{ ...mockExchangeData, vaultAddress: '0xMiXeDcAsE' }]
			});

			expect(Object.keys(result)).toEqual(['0xmixedcase']);
		});

		it('should match asset address case-insensitively in erc20Prices', async () => {
			const prices: CoingeckoSimpleTokenPriceResponse = {
				'0xassetaddress': { usd: 5.0, usd_market_cap: 0 }
			};

			const result = await calculateErc4626Prices({
				erc20Prices: prices,
				erc4626TokensExchangeData: [{ ...mockExchangeData, assetAddress: '0xASSETADDRESS' }]
			});

			expect(result['0xvaultaddress']?.usd).toBe(5.25);
		});
	});
});
