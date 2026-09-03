import { ARBITRUM_SEPOLIA_NETWORK } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import {
	BASE_NETWORK,
	BASE_SEPOLIA_NETWORK
} from '$env/networks/networks-evm/networks.evm.base.env';
import {
	BSC_MAINNET_NETWORK,
	BSC_TESTNET_NETWORK
} from '$env/networks/networks-evm/networks.evm.bsc.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import * as infuraMod from '$eth/providers/infura.providers';
import type * as InfuraRestModule from '$eth/rest/infura.rest';
import { InfuraGasRest } from '$eth/rest/infura.rest';
import { getEthFeeDataWithProvider } from '$eth/services/fee.services';
import type { EthFeePerGas, EthFeePriorities } from '$eth/types/fee';
import { OP_STACK_UNSIGNED_TX_SIZE } from '$evm/base/constants/base.constants';
import {
	BSC_MIN_MAX_FEE_PER_GAS,
	BSC_MIN_MAX_PRIORITY_FEE_PER_GAS
} from '$evm/bsc/constants/bsc.constants';
import { ZERO } from '$lib/constants/app.constants';
import { EthFeePriority } from '$lib/enums/eth-fee-priority';
import type { MockInstance } from 'vitest';

vi.mock('$eth/rest/infura.rest', () => ({
	InfuraGasRest: vi.fn()
}));

const mockSuggestedFeeData = ({
	maxFeePerGas,
	maxPriorityFeePerGas
}: EthFeePerGas): EthFeePriorities => ({
	baseFeePerGas: 5n,
	perPriority: {
		[EthFeePriority.SLOW]: { maxFeePerGas, maxPriorityFeePerGas },
		[EthFeePriority.NORMAL]: { maxFeePerGas, maxPriorityFeePerGas },
		[EthFeePriority.FAST]: { maxFeePerGas, maxPriorityFeePerGas }
	}
});

describe('eth-fee-data.services', () => {
	const network = ETHEREUM_NETWORK;
	const fromAddr = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
	const toAddr = '0x1111111111111111111111111111111111111111';

	beforeEach(() => {
		vi.clearAllMocks();

		InfuraGasRest.prototype.getSuggestedFeeData = vi
			.fn()
			.mockResolvedValue(mockSuggestedFeeData({ maxFeePerGas: 12n, maxPriorityFeePerGas: 7n }));

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
					maxPriorityFeePerGas: 7n,
					baseFeePerGas: 5n
				},
				priorities: mockSuggestedFeeData({ maxFeePerGas: 12n, maxPriorityFeePerGas: 7n }),
				provider: expect.any(Object),
				params: {
					from: fromAddr,
					to: toAddr
				}
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

			InfuraGasRest.prototype.getSuggestedFeeData = vi
				.fn()
				.mockResolvedValue(mockSuggestedFeeData({ maxFeePerGas: 12n, maxPriorityFeePerGas: 7n }));

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

			InfuraGasRest.prototype.getSuggestedFeeData = vi
				.fn()
				.mockResolvedValue(mockSuggestedFeeData({ maxFeePerGas: 12n, maxPriorityFeePerGas: 7n }));

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

			InfuraGasRest.prototype.getSuggestedFeeData = vi
				.fn()
				.mockResolvedValue(mockSuggestedFeeData({ maxFeePerGas: 12n, maxPriorityFeePerGas: 7n }));

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

			InfuraGasRest.prototype.getSuggestedFeeData = vi
				.fn()
				.mockResolvedValue(
					mockSuggestedFeeData({ maxFeePerGas: null, maxPriorityFeePerGas: null })
				);

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

			expect(result.provider).toBeDefined();
			expect(result.provider).toHaveProperty('getFeeData');
			expect(result.provider).toHaveProperty('safeEstimateGas');
			expect(result.provider).toHaveProperty('estimateGas');
		});

		describe('when the Gas API answers with a non-OK response', () => {
			// The MetaMask Gas API does not cover every chain we support: Arbitrum Sepolia
			// (chain id 421614) answers 400 "'421614' is not a supported chain id.".
			// Everything it adds sits on top of the provider's own quote, so losing it has to
			// degrade the estimate rather than block the send.
			const { chainId } = ARBITRUM_SEPOLIA_NETWORK;

			beforeEach(async () => {
				vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false } as unknown as Response));

				const { InfuraGasRest: ActualInfuraGasRest } =
					await vi.importActual<typeof InfuraRestModule>('$eth/rest/infura.rest');

				InfuraGasRest.prototype.getSuggestedFeeData = new ActualInfuraGasRest(
					chainId
				).getSuggestedFeeData;
			});

			afterEach(() => {
				vi.unstubAllGlobals();
			});

			it('should fall back to the provider fee data instead of throwing', async () => {
				const result = await getEthFeeDataWithProvider({
					networkId: ARBITRUM_SEPOLIA_NETWORK.id,
					chainId,
					from: fromAddr,
					to: toAddr
				});

				// No base fee either, so `estimatedGasFee` falls back to the max fee.
				expect(result.feeData).toEqual({
					gasPrice: null,
					maxFeePerGas: 10n,
					maxPriorityFeePerGas: 5n,
					baseFeePerGas: null
				});
			});

			it('should offer no priorities to choose between', async () => {
				const { priorities } = await getEthFeeDataWithProvider({
					networkId: ARBITRUM_SEPOLIA_NETWORK.id,
					chainId,
					from: fromAddr,
					to: toAddr
				});

				expect(priorities).toBeUndefined();
			});

			it('should still apply the BSC fee floor', async () => {
				vi.spyOn(infuraMod, 'infuraProviders').mockReturnValue({
					getFeeData: async () =>
						await new Promise((resolve) =>
							resolve({
								gasPrice: null,
								maxFeePerGas: 500_000_000n,
								maxPriorityFeePerGas: 100_000_000n
							})
						)
				} as unknown as ReturnType<typeof infuraMod.infuraProviders>);

				const result = await getEthFeeDataWithProvider({
					networkId: BSC_MAINNET_NETWORK.id,
					chainId: BSC_MAINNET_NETWORK.chainId,
					from: fromAddr,
					to: toAddr
				});

				expect(result.feeData.maxFeePerGas).toBe(BSC_MIN_MAX_FEE_PER_GAS);
				expect(result.feeData.maxPriorityFeePerGas).toBe(BSC_MIN_MAX_PRIORITY_FEE_PER_GAS);
			});
		});

		describe('priority selection', () => {
			const perPriority = {
				[EthFeePriority.SLOW]: { maxFeePerGas: 100n, maxPriorityFeePerGas: 1n },
				[EthFeePriority.NORMAL]: { maxFeePerGas: 100n, maxPriorityFeePerGas: 5n },
				[EthFeePriority.FAST]: { maxFeePerGas: 100n, maxPriorityFeePerGas: 20n }
			};

			beforeEach(() => {
				vi.spyOn(infuraMod, 'infuraProviders').mockReturnValue({
					getFeeData: async () =>
						await new Promise((resolve) =>
							resolve({ gasPrice: null, maxFeePerGas: ZERO, maxPriorityFeePerGas: ZERO })
						)
				} as unknown as ReturnType<typeof infuraMod.infuraProviders>);

				InfuraGasRest.prototype.getSuggestedFeeData = vi
					.fn()
					.mockResolvedValue({ baseFeePerGas: 20n, perPriority });
			});

			it('defaults to normal when no priority is asked for', async () => {
				const { feeData } = await getEthFeeDataWithProvider({
					networkId: network.id,
					chainId: network.chainId,
					from: fromAddr,
					to: toAddr
				});

				expect(feeData).toEqual(
					expect.objectContaining({ ...perPriority[EthFeePriority.NORMAL], baseFeePerGas: 20n })
				);
			});

			it.each(Object.values(EthFeePriority))(
				'signs the values of the %s priority',
				async (priority) => {
					const { feeData } = await getEthFeeDataWithProvider({
						networkId: network.id,
						chainId: network.chainId,
						from: fromAddr,
						to: toAddr,
						priority
					});

					expect(feeData).toEqual(expect.objectContaining(perPriority[priority]));
				}
			);

			it('returns every priority so they can be priced without another call', async () => {
				const { priorities } = await getEthFeeDataWithProvider({
					networkId: network.id,
					chainId: network.chainId,
					from: fromAddr,
					to: toAddr
				});

				expect(priorities).toEqual({ baseFeePerGas: 20n, perPriority });
			});
		});

		describe('BSC gas fee floor', () => {
			// Reproduces the staging error:
			// "transaction underpriced: gas tip cap 100000000, minimum needed 1000000000"
			// where both ethers.getFeeData() and the Infura Gas API returned values below
			// BSC's 1 gwei minimum tip.
			const lowTip = 100_000_000n; // 0.1 gwei
			const lowMax = 500_000_000n; // 0.5 gwei

			beforeEach(() => {
				vi.spyOn(infuraMod, 'infuraProviders').mockReturnValue({
					getFeeData: async () =>
						await new Promise((resolve) =>
							resolve({
								gasPrice: null,
								maxFeePerGas: lowMax,
								maxPriorityFeePerGas: lowTip
							})
						)
				} as unknown as ReturnType<typeof infuraMod.infuraProviders>);

				InfuraGasRest.prototype.getSuggestedFeeData = vi
					.fn()
					.mockResolvedValue(
						mockSuggestedFeeData({ maxFeePerGas: lowMax, maxPriorityFeePerGas: lowTip })
					);
			});

			it('should apply the BSC mainnet fee floor when both sources return values below the minimum', async () => {
				const result = await getEthFeeDataWithProvider({
					networkId: BSC_MAINNET_NETWORK.id,
					chainId: BSC_MAINNET_NETWORK.chainId,
					from: fromAddr,
					to: toAddr
				});

				expect(result.feeData.maxPriorityFeePerGas).toBe(BSC_MIN_MAX_PRIORITY_FEE_PER_GAS);
				expect(result.feeData.maxFeePerGas).toBe(BSC_MIN_MAX_FEE_PER_GAS);
			});

			it('should apply the BSC testnet fee floor when both sources return values below the minimum', async () => {
				const result = await getEthFeeDataWithProvider({
					networkId: BSC_TESTNET_NETWORK.id,
					chainId: BSC_TESTNET_NETWORK.chainId,
					from: fromAddr,
					to: toAddr
				});

				expect(result.feeData.maxPriorityFeePerGas).toBe(BSC_MIN_MAX_PRIORITY_FEE_PER_GAS);
				expect(result.feeData.maxFeePerGas).toBe(BSC_MIN_MAX_FEE_PER_GAS);
			});

			it('should keep higher provider values on BSC when they exceed the floor', async () => {
				const highTip = BSC_MIN_MAX_PRIORITY_FEE_PER_GAS * 5n;
				const highMax = BSC_MIN_MAX_FEE_PER_GAS * 5n;

				vi.spyOn(infuraMod, 'infuraProviders').mockReturnValue({
					getFeeData: async () =>
						await new Promise((resolve) =>
							resolve({
								gasPrice: null,
								maxFeePerGas: highMax,
								maxPriorityFeePerGas: highTip
							})
						)
				} as unknown as ReturnType<typeof infuraMod.infuraProviders>);

				InfuraGasRest.prototype.getSuggestedFeeData = vi
					.fn()
					.mockResolvedValue(
						mockSuggestedFeeData({ maxFeePerGas: lowMax, maxPriorityFeePerGas: lowTip })
					);

				const result = await getEthFeeDataWithProvider({
					networkId: BSC_MAINNET_NETWORK.id,
					chainId: BSC_MAINNET_NETWORK.chainId,
					from: fromAddr,
					to: toAddr
				});

				expect(result.feeData.maxPriorityFeePerGas).toBe(highTip);
				expect(result.feeData.maxFeePerGas).toBe(highMax);
			});

			it('should NOT apply the BSC floor on non-BSC chains (Ethereum)', async () => {
				const result = await getEthFeeDataWithProvider({
					networkId: network.id,
					chainId: network.chainId,
					from: fromAddr,
					to: toAddr
				});

				expect(result.feeData.maxPriorityFeePerGas).toBe(lowTip);
				expect(result.feeData.maxFeePerGas).toBe(lowMax);
			});
		});

		describe('OP-stack L1 data fee', () => {
			const l1Fee = 875_004_002n;

			let getL1FeeUpperBound: MockInstance;

			beforeEach(() => {
				getL1FeeUpperBound = vi.fn().mockResolvedValue(l1Fee);

				vi.spyOn(infuraMod, 'infuraProviders').mockReturnValue({
					getFeeData: async () =>
						await new Promise((resolve) =>
							resolve({ gasPrice: null, maxFeePerGas: 10n, maxPriorityFeePerGas: 5n })
						),
					getL1FeeUpperBound
				} as unknown as ReturnType<typeof infuraMod.infuraProviders>);
			});

			it.each([BASE_NETWORK, BASE_SEPOLIA_NETWORK])(
				'quotes the L1 data fee on $name',
				async ({ id, chainId }) => {
					const result = await getEthFeeDataWithProvider({
						networkId: id,
						chainId,
						from: fromAddr,
						to: toAddr
					});

					expect(getL1FeeUpperBound).toHaveBeenCalledExactlyOnceWith(OP_STACK_UNSIGNED_TX_SIZE);
					expect(result.feeData.l1Fee).toBe(l1Fee);
				}
			);

			it.each([ETHEREUM_NETWORK, BSC_MAINNET_NETWORK])(
				'leaves it unquoted on $name, which has no such fee',
				async ({ id, chainId }) => {
					const result = await getEthFeeDataWithProvider({
						networkId: id,
						chainId,
						from: fromAddr,
						to: toAddr
					});

					expect(getL1FeeUpperBound).not.toHaveBeenCalled();
					expect(result.feeData.l1Fee).toBeUndefined();
				}
			);

			// Quoting a ceiling we know is short is the defect this PR fixes, so a failed quote has to
			// fail the fetch: `EthFeeContext` surfaces it and retries with backoff.
			it('fails the fetch rather than quoting a ceiling it knows is short', async () => {
				const err = new Error('rate limited');
				getL1FeeUpperBound.mockRejectedValue(err);

				await expect(
					getEthFeeDataWithProvider({
						networkId: BASE_NETWORK.id,
						chainId: BASE_NETWORK.chainId,
						from: fromAddr,
						to: toAddr
					})
				).rejects.toThrow(err);
			});

			it('is the same on every priority, being a flat cost rather than a tip', async () => {
				const l1Fees = await Promise.all(
					Object.values(EthFeePriority).map(async (priority) => {
						const { feeData } = await getEthFeeDataWithProvider({
							networkId: BASE_NETWORK.id,
							chainId: BASE_NETWORK.chainId,
							from: fromAddr,
							to: toAddr,
							priority
						});

						return feeData.l1Fee;
					})
				);

				expect(l1Fees).toEqual([l1Fee, l1Fee, l1Fee]);
			});
		});
	});
});
