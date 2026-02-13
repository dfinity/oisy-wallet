import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ETH_BASE_FEE } from '$eth/constants/eth.constants';
import type { InfuraProvider } from '$eth/providers/infura.providers';
import { InfuraGasRest } from '$eth/rest/infura.rest';
import { calculateEthFee } from '$eth/services/eth-open-crypto-pay.services';
import * as feeServices from '$eth/services/fee.services';
import type { OptionEthAddress } from '$eth/types/address';
import * as erc20Utils from '$eth/utils/erc20.utils';
import * as ethUtils from '$eth/utils/eth.utils';
import * as evmNativeUtils from '$evm/utils/native-token.utils';
import { ZERO } from '$lib/constants/app.constants';
import * as addressDerived from '$lib/derived/address.derived';
import type { PayableToken } from '$lib/types/open-crypto-pay';
import { readable } from 'svelte/store';

vi.mock('$eth/rest/infura.rest', () => ({
	InfuraGasRest: vi.fn()
}));

const mockProvider = {
	getFeeData: vi.fn(),
	safeEstimateGas: vi.fn(),
	estimateGas: vi.fn()
};

vi.mock('$eth/providers/infura.providers', () => ({
	infuraProviders: vi.fn(() => mockProvider)
}));

vi.mock('$eth/providers/infura-erc20-icp.providers', () => ({
	infuraErc20IcpProviders: vi.fn(() => ({ getFeeData: vi.fn() }))
}));

vi.mock('$eth/providers/infura-erc20.providers', () => ({
	infuraErc20Providers: vi.fn(() => ({ getFeeData: vi.fn() }))
}));

vi.mock('$eth/providers/infura-ckerc20.providers', () => ({
	infuraCkErc20Providers: vi.fn(() => ({ getFeeData: vi.fn() }))
}));

vi.mock('$eth/providers/infura-cketh.providers', () => ({
	infuraCkETHProviders: vi.fn(() => ({ getFeeData: vi.fn() }))
}));

describe('eth-open-crypto-pay.services', () => {
	describe('calculateEthFee', () => {
		const fromAddr = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
		const toAddr = '0x1111111111111111111111111111111111111111';

		const mockEthAddress = (address: OptionEthAddress) => {
			vi.spyOn(addressDerived, 'ethAddress', 'get').mockReturnValue(readable(address));
		};

		const baseToken: PayableToken = {
			...ETHEREUM_TOKEN,
			tokenNetwork: 'Ethereum',
			amount: '1.5',
			minFee: 0
		};

		beforeEach(() => {
			vi.clearAllMocks();

			InfuraGasRest.prototype.getSuggestedFeeData = vi.fn().mockResolvedValue({
				maxFeePerGas: 12n,
				maxPriorityFeePerGas: 7n
			});

			mockProvider.getFeeData.mockResolvedValue({
				gasPrice: null,
				maxFeePerGas: 10n,
				maxPriorityFeePerGas: 5n
			});

			mockProvider.safeEstimateGas.mockResolvedValue(21000n);
			mockProvider.estimateGas.mockResolvedValue(21000n);

			vi.spyOn(ethUtils, 'isSupportedEthTokenId').mockReturnValue(false);
			vi.spyOn(evmNativeUtils, 'isSupportedEvmNativeTokenId').mockReturnValue(false);
			vi.spyOn(erc20Utils, 'isTokenErc20').mockReturnValue(false);

			vi.spyOn(feeServices, 'getEthFeeDataWithProvider').mockResolvedValue({
				feeData: {
					maxFeePerGas: 12n,
					maxPriorityFeePerGas: 7n
				},
				provider: mockProvider as unknown as InfuraProvider,
				params: {
					from: fromAddr,
					to: toAddr
				}
			});

			vi.spyOn(feeServices, 'getErc20FeeData').mockResolvedValue(65000n);
		});

		describe('input validation', () => {
			it('should return undefined when ethAddress is null', async () => {
				mockEthAddress(null);

				const result = await calculateEthFee(baseToken);

				expect(result).toBeUndefined();
				expect(feeServices.getEthFeeDataWithProvider).not.toHaveBeenCalled();
			});

			it('should return undefined when ethAddress is undefined', async () => {
				mockEthAddress(undefined);

				const result = await calculateEthFee(baseToken);

				expect(result).toBeUndefined();
				expect(feeServices.getEthFeeDataWithProvider).not.toHaveBeenCalled();
			});

			it('should return undefined when maxFeePerGas is null', async () => {
				mockEthAddress(fromAddr);

				vi.spyOn(feeServices, 'getEthFeeDataWithProvider').mockResolvedValue({
					feeData: {
						maxFeePerGas: null,
						maxPriorityFeePerGas: 7n
					},
					provider: mockProvider as unknown as InfuraProvider,
					params: {
						from: fromAddr,
						to: toAddr
					}
				});

				vi.mocked(ethUtils.isSupportedEthTokenId).mockReturnValue(true);

				const result = await calculateEthFee(baseToken);

				expect(result).toBeUndefined();
			});

			it('should return undefined when gasPrice is ZERO', async () => {
				mockEthAddress(fromAddr);

				vi.spyOn(feeServices, 'getEthFeeDataWithProvider').mockResolvedValue({
					feeData: {
						maxFeePerGas: ZERO,
						maxPriorityFeePerGas: 7n
					},
					provider: mockProvider as unknown as InfuraProvider,
					params: {
						from: fromAddr,
						to: toAddr
					}
				});

				vi.mocked(ethUtils.isSupportedEthTokenId).mockReturnValue(true);

				const result = await calculateEthFee({ ...baseToken, minFee: 0 });

				expect(result).toBeUndefined();
			});
		});

		describe('native ETH/EVM token', () => {
			it('should calculate fee for native ETH token', async () => {
				mockEthAddress(fromAddr);
				vi.mocked(ethUtils.isSupportedEthTokenId).mockReturnValue(true);
				mockProvider.safeEstimateGas.mockResolvedValue(21000n);

				const result = await calculateEthFee(baseToken);

				expect(result).toBeDefined();
				expect(result?.estimatedGasLimit).toBe(21000n);
				expect(result?.feeInWei).toBe(12n * 21000n);
				expect(result?.feeData.maxFeePerGas).toBe(12n);
			});

			it('should calculate fee for EVM native token', async () => {
				mockEthAddress(fromAddr);
				vi.mocked(evmNativeUtils.isSupportedEvmNativeTokenId).mockReturnValue(true);
				mockProvider.safeEstimateGas.mockResolvedValue(21000n);

				const result = await calculateEthFee(baseToken);

				expect(result).toBeDefined();
				expect(result?.estimatedGasLimit).toBe(21000n);
				expect(result?.feeInWei).toBe(12n * 21000n);
			});

			it('should use ETH_BASE_FEE when safeEstimateGas returns lower value', async () => {
				mockEthAddress(fromAddr);
				vi.mocked(ethUtils.isSupportedEthTokenId).mockReturnValue(true);
				mockProvider.safeEstimateGas.mockResolvedValue(10000n);

				const result = await calculateEthFee(baseToken);

				expect(result).toBeDefined();
				expect(result?.estimatedGasLimit).toBe(ETH_BASE_FEE);
				expect(result?.feeInWei).toBe(12n * ETH_BASE_FEE);
			});

			it('should include value in safeEstimateGas when token has amount', async () => {
				mockEthAddress(fromAddr);
				vi.mocked(ethUtils.isSupportedEthTokenId).mockReturnValue(true);
				const tokenWithAmount = { ...baseToken, amount: '1.5', decimals: 18 };

				await calculateEthFee(tokenWithAmount);

				expect(mockProvider.safeEstimateGas).toHaveBeenCalledWith(
					expect.objectContaining({
						value: expect.any(BigInt)
					})
				);
			});
		});

		describe('ERC20 token', () => {
			it('should calculate fee for ERC20 token', async () => {
				mockEthAddress(fromAddr);
				vi.mocked(erc20Utils.isTokenErc20).mockReturnValue(true);
				vi.mocked(feeServices.getErc20FeeData).mockResolvedValue(65000n);

				const erc20Token = {
					...baseToken,
					standard: { code: 'erc20' },
					address: '0x1234567890123456789012345678901234567890'
				} as unknown as PayableToken;

				const result = await calculateEthFee(erc20Token);

				expect(result).toBeDefined();
				expect(result?.estimatedGasLimit).toBe(65000n);
				expect(result?.feeInWei).toBe(12n * 65000n);
			});
		});
	});
});
