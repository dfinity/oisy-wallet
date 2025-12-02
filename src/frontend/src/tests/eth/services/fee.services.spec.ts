import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import * as infuraMod from '$eth/providers/infura.providers';
import { InfuraGasRest } from '$eth/rest/infura.rest';
import { getEthFeeDataWithProvider } from '$eth/services/fee.services';
import { ZERO } from '$lib/constants/app.constants';

vi.mock('$eth/rest/infura.rest', () => ({
	InfuraGasRest: vi.fn()
}));

describe('eth-fee-data.services', () => {
	const network = ETHEREUM_NETWORK;
	const fromAddr = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
	const toAddr = '0x1111111111111111111111111111111111111111';

	beforeEach(() => {
		vi.clearAllMocks();

		InfuraGasRest.prototype.getSuggestedFeeData = vi.fn().mockResolvedValue({
			maxFeePerGas: 12n,
			maxPriorityFeePerGas: 7n
		});

		vi.spyOn(infuraMod, 'infuraProviders').mockReturnValue({
			getFeeData: async () =>
				await new Promise((resolve) =>
					resolve({
						gasPrice: null,
						maxFeePerGas: 10n,
						maxPriorityFeePerGas: 5n
					})
				),
			safeEstimateGas: async () => await new Promise((resolve) => resolve(ZERO)),
			estimateGas: async () => await new Promise((resolve) => resolve(ZERO))
		} as unknown as ReturnType<typeof infuraMod.infuraProviders>);
	});

	describe('getEthFeeDataWithProvider', () => {
		it('should return enhanced fee data with providers and params', async () => {
			const result = await getEthFeeDataWithProvider({
				networkId: network.id,
				chainId: network.chainId,
				from: fromAddr,
				to: toAddr
			});

			expect(result).toEqual({
				feeData: {
					gasPrice: null,
					maxFeePerGas: 12n,
					maxPriorityFeePerGas: 7n
				},
				providers: expect.any(Object),
				params: {
					from: fromAddr,
					to: toAddr
				}
			});
		});

		it('should use from address as to when to is empty string', async () => {
			const result = await getEthFeeDataWithProvider({
				networkId: network.id,
				chainId: network.chainId,
				from: fromAddr,
				to: ''
			});

			expect(result.params).toEqual({
				from: fromAddr,
				to: fromAddr
			});
		});

		it('should use from address as to when to is not provided', async () => {
			const result = await getEthFeeDataWithProvider({
				networkId: network.id,
				chainId: network.chainId,
				from: fromAddr,
				to: fromAddr
			});

			expect(result.params).toEqual({
				from: fromAddr,
				to: fromAddr
			});
		});

		it('should select max value between getFeeData and suggested fee data', async () => {
			vi.spyOn(infuraMod, 'infuraProviders').mockReturnValue({
				getFeeData: async () =>
					await new Promise((resolve) =>
						resolve({
							gasPrice: null,
							maxFeePerGas: 100n,
							maxPriorityFeePerGas: 50n
						})
					)
			} as unknown as ReturnType<typeof infuraMod.infuraProviders>);

			InfuraGasRest.prototype.getSuggestedFeeData = vi.fn().mockResolvedValue({
				maxFeePerGas: 12n,
				maxPriorityFeePerGas: 7n
			});

			const result = await getEthFeeDataWithProvider({
				networkId: network.id,
				chainId: network.chainId,
				from: fromAddr,
				to: toAddr
			});

			expect(result.feeData.maxFeePerGas).toBe(100n);
			expect(result.feeData.maxPriorityFeePerGas).toBe(50n);
		});

		it('should handle null maxFeePerGas from getFeeData', async () => {
			vi.spyOn(infuraMod, 'infuraProviders').mockReturnValue({
				getFeeData: async () =>
					await new Promise((resolve) =>
						resolve({
							gasPrice: null,
							maxFeePerGas: null,
							maxPriorityFeePerGas: 5n
						})
					)
			} as unknown as ReturnType<typeof infuraMod.infuraProviders>);

			InfuraGasRest.prototype.getSuggestedFeeData = vi.fn().mockResolvedValue({
				maxFeePerGas: 12n,
				maxPriorityFeePerGas: 7n
			});

			const result = await getEthFeeDataWithProvider({
				networkId: network.id,
				chainId: network.chainId,
				from: fromAddr,
				to: toAddr
			});

			expect(result.feeData.maxFeePerGas).toBe(12n);
			expect(result.feeData.maxPriorityFeePerGas).toBe(7n);
		});

		it('should handle null maxPriorityFeePerGas from getFeeData', async () => {
			vi.spyOn(infuraMod, 'infuraProviders').mockReturnValue({
				getFeeData: async () =>
					await new Promise((resolve) =>
						resolve({
							gasPrice: null,
							maxFeePerGas: 10n,
							maxPriorityFeePerGas: null
						})
					)
			} as unknown as ReturnType<typeof infuraMod.infuraProviders>);

			InfuraGasRest.prototype.getSuggestedFeeData = vi.fn().mockResolvedValue({
				maxFeePerGas: 12n,
				maxPriorityFeePerGas: 7n
			});

			const result = await getEthFeeDataWithProvider({
				networkId: network.id,
				chainId: network.chainId,
				from: fromAddr,
				to: toAddr
			});

			expect(result.feeData.maxFeePerGas).toBe(12n);
			expect(result.feeData.maxPriorityFeePerGas).toBe(7n);
		});

		it('should handle both values being null', async () => {
			vi.spyOn(infuraMod, 'infuraProviders').mockReturnValue({
				getFeeData: async () =>
					await new Promise((resolve) =>
						resolve({
							gasPrice: null,
							maxFeePerGas: null,
							maxPriorityFeePerGas: null
						})
					)
			} as unknown as ReturnType<typeof infuraMod.infuraProviders>);

			InfuraGasRest.prototype.getSuggestedFeeData = vi.fn().mockResolvedValue({
				maxFeePerGas: null,
				maxPriorityFeePerGas: null
			});

			const result = await getEthFeeDataWithProvider({
				networkId: network.id,
				chainId: network.chainId,
				from: fromAddr,
				to: toAddr
			});

			expect(result.feeData.maxFeePerGas).toBeNull();
			expect(result.feeData.maxPriorityFeePerGas).toBeNull();
		});

		it('should call InfuraGasRest with correct chainId', async () => {
			const chainId = 1n;

			await getEthFeeDataWithProvider({
				networkId: network.id,
				chainId,
				from: fromAddr,
				to: toAddr
			});

			expect(InfuraGasRest).toHaveBeenCalledWith(chainId);
		});

		it('should call infuraProviders with correct networkId', async () => {
			const spy = vi.spyOn(infuraMod, 'infuraProviders');

			await getEthFeeDataWithProvider({
				networkId: network.id,
				chainId: network.chainId,
				from: fromAddr,
				to: toAddr
			});

			expect(spy).toHaveBeenCalledWith(network.id);
		});

		it('should preserve gasPrice from getFeeData', async () => {
			vi.spyOn(infuraMod, 'infuraProviders').mockReturnValue({
				getFeeData: async () =>
					await new Promise((resolve) =>
						resolve({
							gasPrice: 999n,
							maxFeePerGas: 10n,
							maxPriorityFeePerGas: 5n
						})
					)
			} as unknown as ReturnType<typeof infuraMod.infuraProviders>);

			const result = await getEthFeeDataWithProvider({
				networkId: network.id,
				chainId: network.chainId,
				from: fromAddr,
				to: toAddr
			});

			expect(result.feeData.gasPrice).toBe(999n);
		});

		it('should add 0x prefix to addresses if missing', async () => {
			const fromWithout0x = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
			const toWithout0x = '1111111111111111111111111111111111111111';

			const result = await getEthFeeDataWithProvider({
				networkId: network.id,
				chainId: network.chainId,
				from: fromWithout0x,
				to: toWithout0x
			});

			expect(result.params.from).toBe(`0x${fromWithout0x}`);
			expect(result.params.to).toBe(`0x${toWithout0x}`);
		});

		it('should not double-add 0x prefix if already present', async () => {
			const result = await getEthFeeDataWithProvider({
				networkId: network.id,
				chainId: network.chainId,
				from: fromAddr,
				to: toAddr // Already has 0x
			});

			expect(result.params.from).toBe(fromAddr);
			expect(result.params.to).toBe(toAddr);
		});

		it('should return providers object', async () => {
			const result = await getEthFeeDataWithProvider({
				networkId: network.id,
				chainId: network.chainId,
				from: fromAddr,
				to: toAddr
			});

			expect(result.providers).toBeDefined();
			expect(result.providers).toHaveProperty('getFeeData');
			expect(result.providers).toHaveProperty('safeEstimateGas');
			expect(result.providers).toHaveProperty('estimateGas');
		});
	});
});
