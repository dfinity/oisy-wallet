import { ARBITRUM_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { ARBITRUM_MAINNET_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { ETHEREUM_NETWORK, ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
import type { Erc20Token } from '$eth/types/erc20';
import * as nearIntentsApi from '$lib/rest/near-intents.rest';
import {
	clearNearIntentsTokensCache,
	fetchNearIntentsSwapQuote,
	loadNearIntentsTokens,
	nearIntentsSupportedTokens,
	pollNearIntentsStatus,
	submitNearIntentsDepositTx
} from '$lib/services/near-intents.services';
import type { NearIntentsToken } from '$lib/types/near-intents';
import { SwapProvider } from '$lib/types/swap';
import { mapNearIntentsQuoteResult } from '$lib/utils/swap.utils';
import { parseNetworkId } from '$lib/validation/network.validation';
import type { SplToken } from '$sol/types/spl';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import {
	mockNearIntentsQuoteResponse,
	mockNearIntentsStatusFailed,
	mockNearIntentsStatusPending,
	mockNearIntentsStatusSuccess,
	mockNearIntentsTokens
} from '$tests/mocks/near-intents.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';

vi.mock('$env/rest/near-intents.env', () => ({
	NEAR_INTENTS_SWAP_ENABLED: true,
	NEAR_INTENTS_API_KEY: 'mock-api-key'
}));

vi.mock('$lib/rest/near-intents.rest', () => ({
	fetchNearIntentsTokens: vi.fn(),
	fetchNearIntentsQuote: vi.fn(),
	fetchNearIntentsStatus: vi.fn(),
	submitNearIntentsDeposit: vi.fn()
}));

describe('near-intents.services', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		clearNearIntentsTokensCache();
	});

	describe('loadNearIntentsTokens', () => {
		it('should fetch tokens from the API', async () => {
			vi.mocked(nearIntentsApi.fetchNearIntentsTokens).mockResolvedValue(mockNearIntentsTokens);

			const result = await loadNearIntentsTokens();

			expect(nearIntentsApi.fetchNearIntentsTokens).toHaveBeenCalledOnce();
			expect(result).toEqual(mockNearIntentsTokens);
		});

		it('should cache tokens after first fetch', async () => {
			vi.mocked(nearIntentsApi.fetchNearIntentsTokens).mockResolvedValue(mockNearIntentsTokens);

			await loadNearIntentsTokens();
			await loadNearIntentsTokens();

			expect(nearIntentsApi.fetchNearIntentsTokens).toHaveBeenCalledOnce();
		});

		it('should refetch after cache is cleared', async () => {
			vi.mocked(nearIntentsApi.fetchNearIntentsTokens).mockResolvedValue(mockNearIntentsTokens);

			await loadNearIntentsTokens();
			clearNearIntentsTokensCache();
			await loadNearIntentsTokens();

			expect(nearIntentsApi.fetchNearIntentsTokens).toHaveBeenCalledTimes(2);
		});
	});

	describe('mapNearIntentsQuoteResult', () => {
		it('should map a quote response to a SwapMappedResult', () => {
			const result = mapNearIntentsQuoteResult(mockNearIntentsQuoteResponse);

			expect(result).toStrictEqual({
				provider: SwapProvider.NEAR_INTENTS,
				receiveAmount: BigInt(mockNearIntentsQuoteResponse.quote.amountOut),
				receiveOutMinimum: BigInt(mockNearIntentsQuoteResponse.quote.minAmountOut ?? '0'),
				swapDetails: mockNearIntentsQuoteResponse
			});
		});

		it('should set receiveOutMinimum to undefined when minAmountOut is absent', () => {
			const quoteWithoutMin = {
				...mockNearIntentsQuoteResponse,
				quote: { ...mockNearIntentsQuoteResponse.quote, minAmountOut: undefined }
			};

			const result = mapNearIntentsQuoteResult(quoteWithoutMin);

			expect(result).toStrictEqual({
				provider: SwapProvider.NEAR_INTENTS,
				receiveAmount: BigInt(mockNearIntentsQuoteResponse.quote.amountOut),
				receiveOutMinimum: undefined,
				swapDetails: quoteWithoutMin
			});
		});
	});

	describe('fetchNearIntentsSwapQuote', () => {
		const slippage = 1.5;

		const sourceToken: Erc20Token = {
			...mockValidErc20Token,
			network: ETHEREUM_NETWORK,
			address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
		};

		const destinationToken: Erc20Token = {
			...mockValidErc20Token,
			network: ARBITRUM_MAINNET_NETWORK,
			address: '0xaf88d065e77c8cc2239327c5edb3a432268e5831'
		};

		beforeEach(() => {
			vi.mocked(nearIntentsApi.fetchNearIntentsTokens).mockResolvedValue(mockNearIntentsTokens);
		});

		it('should return a SwapMappedResult on successful quote', async () => {
			vi.mocked(nearIntentsApi.fetchNearIntentsQuote).mockResolvedValue(
				mockNearIntentsQuoteResponse
			);

			const result = await fetchNearIntentsSwapQuote({
				sourceToken,
				destinationToken,
				amount: 1_000_000n,
				userAddress: mockEthAddress,
				slippage
			});

			expect(result).toStrictEqual({
				provider: SwapProvider.NEAR_INTENTS,
				receiveAmount: BigInt(mockNearIntentsQuoteResponse.quote.amountOut),
				receiveOutMinimum: BigInt(mockNearIntentsQuoteResponse.quote.minAmountOut ?? '0'),
				swapDetails: mockNearIntentsQuoteResponse
			});
		});

		it('should call the API with EXACT_INPUT swap type', async () => {
			vi.mocked(nearIntentsApi.fetchNearIntentsQuote).mockResolvedValue(
				mockNearIntentsQuoteResponse
			);

			await fetchNearIntentsSwapQuote({
				sourceToken,
				destinationToken,
				amount: 1_000_000n,
				userAddress: mockEthAddress,
				slippage
			});

			expect(nearIntentsApi.fetchNearIntentsQuote).toHaveBeenCalledWith(
				expect.objectContaining({
					swapType: 'EXACT_INPUT',
					slippageTolerance: 150,
					originAsset: 'nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near',
					depositType: 'ORIGIN_CHAIN',
					destinationAsset: 'nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near',
					amount: '1000000',
					recipient: mockEthAddress,
					recipientType: 'DESTINATION_CHAIN',
					refundTo: mockEthAddress,
					refundType: 'ORIGIN_CHAIN'
				})
			);
		});

		it('should return undefined when userAddress is nullish', async () => {
			const result = await fetchNearIntentsSwapQuote({
				sourceToken,
				destinationToken,
				amount: 1_000_000n,
				userAddress: undefined,
				slippage
			});

			expect(result).toBeUndefined();
			expect(nearIntentsApi.fetchNearIntentsQuote).not.toHaveBeenCalled();
		});

		it('should return undefined when source token blockchain is unsupported', async () => {
			const unsupportedToken: Erc20Token = {
				...sourceToken,
				network: { ...sourceToken.network, id: parseNetworkId('UNSUPPORTED') }
			};

			const result = await fetchNearIntentsSwapQuote({
				sourceToken: unsupportedToken,
				destinationToken,
				amount: 1_000_000n,
				userAddress: mockEthAddress,
				slippage
			});

			expect(result).toBeUndefined();
		});

		it('should return undefined when source token is not found in NEAR Intents tokens', async () => {
			const unknownToken: Erc20Token = {
				...sourceToken,
				address: '0xUnknownContractAddress'
			};

			const result = await fetchNearIntentsSwapQuote({
				sourceToken: unknownToken,
				destinationToken,
				amount: 1_000_000n,
				userAddress: mockEthAddress,
				slippage
			});

			expect(result).toBeUndefined();
		});

		it('should return undefined when destination token is not found in NEAR Intents tokens', async () => {
			const unknownDest: Erc20Token = {
				...destinationToken,
				address: '0xUnknownDestAddress'
			};

			const result = await fetchNearIntentsSwapQuote({
				sourceToken,
				destinationToken: unknownDest,
				amount: 1_000_000n,
				userAddress: mockEthAddress,
				slippage
			});

			expect(result).toBeUndefined();
		});

		describe('with Solana tokens', () => {
			const solSourceToken: SplToken = {
				...mockValidSplToken,
				address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
			};

			const evmDestinationToken: Erc20Token = {
				...mockValidErc20Token,
				network: ETHEREUM_NETWORK,
				address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
			};

			beforeEach(() => {
				vi.mocked(nearIntentsApi.fetchNearIntentsTokens).mockResolvedValue(mockNearIntentsTokens);
			});

			it('should return a SwapMappedResult for SOL-SPL to EVM quote', async () => {
				vi.mocked(nearIntentsApi.fetchNearIntentsQuote).mockResolvedValue(
					mockNearIntentsQuoteResponse
				);

				const result = await fetchNearIntentsSwapQuote({
					sourceToken: solSourceToken,
					destinationToken: evmDestinationToken,
					amount: 1_000_000n,
					userAddress: mockSolAddress,
					slippage
				});

				expect(result).toStrictEqual({
					provider: SwapProvider.NEAR_INTENTS,
					receiveAmount: BigInt(mockNearIntentsQuoteResponse.quote.amountOut),
					receiveOutMinimum: BigInt(mockNearIntentsQuoteResponse.quote.minAmountOut ?? '0'),
					swapDetails: mockNearIntentsQuoteResponse
				});
			});

			it('should return undefined when userAddress is nullish', async () => {
				const result = await fetchNearIntentsSwapQuote({
					sourceToken: solSourceToken,
					destinationToken: evmDestinationToken,
					amount: 1_000_000n,
					userAddress: undefined,
					slippage
				});

				expect(result).toBeUndefined();
				expect(nearIntentsApi.fetchNearIntentsQuote).not.toHaveBeenCalled();
			});

			it('should return undefined when SPL token is not found in NEAR Intents tokens', async () => {
				const unknownSplToken: SplToken = {
					...solSourceToken,
					address: 'UnknownMintAddress123456789012345678901234567'
				};

				const result = await fetchNearIntentsSwapQuote({
					sourceToken: unknownSplToken,
					destinationToken: evmDestinationToken,
					amount: 1_000_000n,
					userAddress: mockSolAddress,
					slippage
				});

				expect(result).toBeUndefined();
			});

			it('should call the API with correct Solana asset IDs', async () => {
				vi.mocked(nearIntentsApi.fetchNearIntentsQuote).mockResolvedValue(
					mockNearIntentsQuoteResponse
				);

				await fetchNearIntentsSwapQuote({
					sourceToken: solSourceToken,
					destinationToken: evmDestinationToken,
					amount: 1_000_000n,
					userAddress: mockSolAddress,
					slippage
				});

				expect(nearIntentsApi.fetchNearIntentsQuote).toHaveBeenCalledWith(
					expect.objectContaining({
						originAsset: 'nep141:sol-EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v.omft.near',
						destinationAsset: 'nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near',
						recipient: mockSolAddress,
						refundTo: mockSolAddress
					})
				);
			});
		});
	});

	describe('submitNearIntentsDepositTx', () => {
		it('should call submitNearIntentsDeposit with correct params', async () => {
			vi.mocked(nearIntentsApi.submitNearIntentsDeposit).mockResolvedValue(
				mockNearIntentsStatusSuccess
			);

			await submitNearIntentsDepositTx({
				depositAddress: '0xDeposit',
				txHash: '0xHash'
			});

			expect(nearIntentsApi.submitNearIntentsDeposit).toHaveBeenCalledWith({
				txHash: '0xHash',
				depositAddress: '0xDeposit'
			});
		});

		it('should include memo when provided', async () => {
			vi.mocked(nearIntentsApi.submitNearIntentsDeposit).mockResolvedValue(
				mockNearIntentsStatusSuccess
			);

			await submitNearIntentsDepositTx({
				depositAddress: '0xDeposit',
				txHash: '0xHash',
				depositMemo: 'test-memo'
			});

			expect(nearIntentsApi.submitNearIntentsDeposit).toHaveBeenCalledWith({
				txHash: '0xHash',
				depositAddress: '0xDeposit',
				memo: 'test-memo'
			});
		});
	});

	describe('pollNearIntentsStatus', () => {
		it('should resolve when status is SUCCESS', async () => {
			vi.mocked(nearIntentsApi.fetchNearIntentsStatus).mockResolvedValue(
				mockNearIntentsStatusSuccess
			);

			await expect(pollNearIntentsStatus({ depositAddress: '0xDeposit' })).resolves.toBeUndefined();

			expect(nearIntentsApi.fetchNearIntentsStatus).toHaveBeenCalledOnce();
		});

		it('should throw when status is FAILED', async () => {
			vi.mocked(nearIntentsApi.fetchNearIntentsStatus).mockResolvedValue(
				mockNearIntentsStatusFailed
			);

			await expect(pollNearIntentsStatus({ depositAddress: '0xDeposit' })).rejects.toThrow(
				'NEAR Intents swap failed'
			);
		});

		it('should poll multiple times until terminal status', async () => {
			vi.mocked(nearIntentsApi.fetchNearIntentsStatus)
				.mockResolvedValueOnce(mockNearIntentsStatusPending)
				.mockResolvedValueOnce({ ...mockNearIntentsStatusPending, status: 'PROCESSING' })
				.mockResolvedValueOnce(mockNearIntentsStatusSuccess);

			await pollNearIntentsStatus({ depositAddress: '0xDeposit' });

			expect(nearIntentsApi.fetchNearIntentsStatus).toHaveBeenCalledTimes(3);
		});

		it('includes depositMemo in status calls', async () => {
			vi.mocked(nearIntentsApi.fetchNearIntentsStatus).mockResolvedValue(
				mockNearIntentsStatusSuccess
			);

			await pollNearIntentsStatus({
				depositAddress: '0xDeposit',
				depositMemo: 'test-memo'
			});

			expect(nearIntentsApi.fetchNearIntentsStatus).toHaveBeenCalledWith({
				depositAddress: '0xDeposit',
				depositMemo: 'test-memo'
			});
		});
	});

	describe('nearIntentsSupportedTokens', () => {
		beforeEach(() => {
			vi.clearAllMocks();
			clearNearIntentsTokensCache();
		});

		it('should return contract addresses for EVM tokens when filtering by Ethereum network', async () => {
			vi.mocked(nearIntentsApi.fetchNearIntentsTokens).mockResolvedValue(mockNearIntentsTokens);

			const result = await nearIntentsSupportedTokens({ networkIds: [ETHEREUM_NETWORK_ID] });

			expect(result).toEqual(
				new Set([
					'0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
					'eth'
				])
			);
		});

		it('should return contract addresses and symbols across multiple EVM networks', async () => {
			vi.mocked(nearIntentsApi.fetchNearIntentsTokens).mockResolvedValue(mockNearIntentsTokens);

			const result = await nearIntentsSupportedTokens({
				networkIds: [ETHEREUM_NETWORK_ID, ARBITRUM_MAINNET_NETWORK_ID]
			});

			expect(result).toEqual(
				new Set([
					'0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
					'eth',
					'0xaf88d065e77c8cc2239327c5edb3a432268e5831'
				])
			);
		});

		it('should return Solana token addresses when filtering by Solana network', async () => {
			vi.mocked(nearIntentsApi.fetchNearIntentsTokens).mockResolvedValue(mockNearIntentsTokens);

			const result = await nearIntentsSupportedTokens({ networkIds: [SOLANA_MAINNET_NETWORK_ID] });

			expect(result).toEqual(
				new Set(['sol', 'epjfwdd5aufqssqem2qn1xzybapc8g4weggkzwytdt1v'])
			);
		});

		it('should return empty set when no tokens match the given network', async () => {
			vi.mocked(nearIntentsApi.fetchNearIntentsTokens).mockResolvedValue(mockNearIntentsTokens);

			const result = await nearIntentsSupportedTokens({ networkIds: [parseNetworkId('unknown-network')] });

			expect(result).toEqual(new Set());
		});

		it('should return empty set when token list is empty', async () => {
			vi.mocked(nearIntentsApi.fetchNearIntentsTokens).mockResolvedValue([]);

			const result = await nearIntentsSupportedTokens({ networkIds: [ETHEREUM_NETWORK_ID] });

			expect(result).toEqual(new Set());
		});

		it('should use lowercase symbol for native tokens without contractAddress', async () => {
			vi.mocked(nearIntentsApi.fetchNearIntentsTokens).mockResolvedValue(mockNearIntentsTokens);

			const result = await nearIntentsSupportedTokens({ networkIds: [ETHEREUM_NETWORK_ID] });

			expect(result.has('eth')).toBe(true);
			expect(result.has('ETH')).toBe(false);
		});

		it('should lowercase mixed-case EVM contract addresses', async () => {
			const mixedCaseToken: NearIntentsToken = {
				assetId: 'nep141:eth-0xA0b86991C6218B36C1D19D4a2E9eB0cE3606eB48.omft.near',
				decimals: 6,
				blockchain: 'eth',
				symbol: 'USDC',
				price: 1.0,
				priceUpdatedAt: '2026-03-16T00:00:00.000Z',
				contractAddress: '0xA0b86991C6218B36C1D19D4a2E9eB0cE3606eB48'
			};

			vi.mocked(nearIntentsApi.fetchNearIntentsTokens).mockResolvedValue([mixedCaseToken]);

			const result = await nearIntentsSupportedTokens({ networkIds: [ETHEREUM_NETWORK_ID] });

			expect(result.has('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48')).toBe(true);
			expect(result.has('0xA0b86991C6218B36C1D19D4a2E9eB0cE3606eB48')).toBe(false);
		});

		it('should lowercase mixed-case Solana contract addresses', async () => {
			vi.mocked(nearIntentsApi.fetchNearIntentsTokens).mockResolvedValue(mockNearIntentsTokens);

			const result = await nearIntentsSupportedTokens({ networkIds: [SOLANA_MAINNET_NETWORK_ID] });

			expect(result.has('epjfwdd5aufqssqem2qn1xzybapc8g4weggkzwytdt1v')).toBe(true);
			expect(result.has('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')).toBe(false);
		});
	});
});
