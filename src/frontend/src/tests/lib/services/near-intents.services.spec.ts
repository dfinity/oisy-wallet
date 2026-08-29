import {
	ARBITRUM_MAINNET_NETWORK,
	ARBITRUM_MAINNET_NETWORK_ID
} from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK, ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import type { Erc20Token } from '$eth/types/erc20';
import {
	NEAR_INTENTS_BTC_QUOTE_DEADLINE_MS,
	NEAR_INTENTS_QUOTE_DEADLINE_MS
} from '$lib/constants/swap.constants';
import * as nearIntentsApi from '$lib/rest/near-intents.rest';
import {
	clearNearIntentsTokensCache,
	fetchNearIntentsSwapQuote,
	loadNearIntentsTokens,
	nearIntentsSupportedTokens,
	submitNearIntentsDepositTx
} from '$lib/services/near-intents.services';
import type { NearIntentsToken } from '$lib/types/near-intents';
import { SwapProvider } from '$lib/types/swap';
import {
	findNearIntentsQuoteRequestMismatch,
	isNearIntentsQuoteExpired,
	verifyNearIntentsQuoteSignature
} from '$lib/utils/near-intents-quote.utils';
import { mapNearIntentsQuoteResult } from '$lib/utils/swap.utils';
import { parseNetworkId } from '$lib/validation/network.validation';
import type { SplToken } from '$sol/types/spl';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import {
	mockNearIntentsQuoteResponse,
	mockNearIntentsStatusSuccess,
	mockNearIntentsTokens
} from '$tests/mocks/near-intents.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { mockValidSplToken } from '$tests/mocks/spl-tokens.mock';

vi.mock('$env/rest/near-intents.env', () => ({
	NEAR_INTENTS_SWAP_ENABLED: true,
	NEAR_INTENTS_BTC_SWAP_ENABLED: true,
	NEAR_INTENTS_API_KEY: 'mock-api-key'
}));

// The real implementation is covered against a captured 1Click response in
// near-intents-quote.utils.spec.ts; here the quotes are fixtures with no genuine signature.
vi.mock('$lib/utils/near-intents-quote.utils', () => ({
	verifyNearIntentsQuoteSignature: vi.fn(),
	findNearIntentsQuoteRequestMismatch: vi.fn(),
	isNearIntentsQuoteExpired: vi.fn()
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

		vi.mocked(verifyNearIntentsQuoteSignature).mockResolvedValue(true);
		vi.mocked(findNearIntentsQuoteRequestMismatch).mockReturnValue(undefined);
		vi.mocked(isNearIntentsQuoteExpired).mockReturnValue(false);

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

		it('should reject a quote whose signature does not verify', async () => {
			vi.mocked(nearIntentsApi.fetchNearIntentsQuote).mockResolvedValue(
				mockNearIntentsQuoteResponse
			);
			vi.mocked(verifyNearIntentsQuoteSignature).mockResolvedValue(false);

			await expect(
				fetchNearIntentsSwapQuote({
					sourceToken,
					destinationToken,
					amount: 1_000_000n,
					userAddress: mockEthAddress,
					slippage
				})
			).rejects.toThrow('signature verification failed');
		});

		// A replayed quote carries a genuine signature, so only the echoed request reveals
		// that it was issued to someone else.
		it('should reject a genuinely signed quote issued for another request', async () => {
			vi.mocked(nearIntentsApi.fetchNearIntentsQuote).mockResolvedValue(
				mockNearIntentsQuoteResponse
			);
			vi.mocked(findNearIntentsQuoteRequestMismatch).mockReturnValue('recipient');

			await expect(
				fetchNearIntentsSwapQuote({
					sourceToken,
					destinationToken,
					amount: 1_000_000n,
					userAddress: mockEthAddress,
					slippage
				})
			).rejects.toThrow('does not match the request: recipient');
		});

		it('should reject a captured quote whose signed window has lapsed', async () => {
			vi.mocked(nearIntentsApi.fetchNearIntentsQuote).mockResolvedValue(
				mockNearIntentsQuoteResponse
			);
			vi.mocked(isNearIntentsQuoteExpired).mockReturnValue(true);

			await expect(
				fetchNearIntentsSwapQuote({
					sourceToken,
					destinationToken,
					amount: 1_000_000n,
					userAddress: mockEthAddress,
					slippage
				})
			).rejects.toThrow('past the window it was signed for');
		});

		it('should verify the quote against the request it sent', async () => {
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

			expect(findNearIntentsQuoteRequestMismatch).toHaveBeenCalledWith({
				sent: vi.mocked(nearIntentsApi.fetchNearIntentsQuote).mock.calls[0][0],
				echoed: mockNearIntentsQuoteResponse.quoteRequest
			});
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

		describe('quote deadline per origin chain', () => {
			const now = new Date('2026-03-16T00:00:00.000Z');

			const solSourceToken: SplToken = {
				...mockValidSplToken,
				address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
			};

			beforeEach(() => {
				vi.useFakeTimers();
				vi.setSystemTime(now);

				vi.mocked(nearIntentsApi.fetchNearIntentsQuote).mockResolvedValue(
					mockNearIntentsQuoteResponse
				);
			});

			afterEach(() => {
				vi.useRealTimers();
			});

			const requestedDeadline = (): string => {
				const [[request]] = vi.mocked(nearIntentsApi.fetchNearIntentsQuote).mock.calls;

				return request.deadline;
			};

			it('should use the extended deadline for a BTC origin', async () => {
				await fetchNearIntentsSwapQuote({
					sourceToken: BTC_MAINNET_TOKEN,
					destinationToken,
					amount: 100_000n,
					userAddress: mockBtcAddress,
					slippage
				});

				expect(requestedDeadline()).toBe(
					new Date(now.getTime() + NEAR_INTENTS_BTC_QUOTE_DEADLINE_MS).toISOString()
				);
			});

			it('should keep the short deadline for an EVM origin', async () => {
				await fetchNearIntentsSwapQuote({
					sourceToken,
					destinationToken,
					amount: 1_000_000n,
					userAddress: mockEthAddress,
					slippage
				});

				expect(requestedDeadline()).toBe(
					new Date(now.getTime() + NEAR_INTENTS_QUOTE_DEADLINE_MS).toISOString()
				);
			});

			it('should keep the short deadline for a SOL origin', async () => {
				await fetchNearIntentsSwapQuote({
					sourceToken: solSourceToken,
					destinationToken,
					amount: 1_000_000n,
					userAddress: mockSolAddress,
					slippage
				});

				expect(requestedDeadline()).toBe(
					new Date(now.getTime() + NEAR_INTENTS_QUOTE_DEADLINE_MS).toISOString()
				);
			});
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

	describe('nearIntentsSupportedTokens', () => {
		beforeEach(() => {
			vi.clearAllMocks();
			clearNearIntentsTokensCache();
		});

		it('should return contract addresses for EVM tokens when filtering by Ethereum network', async () => {
			vi.mocked(nearIntentsApi.fetchNearIntentsTokens).mockResolvedValue(mockNearIntentsTokens);

			const result = await nearIntentsSupportedTokens({ networkIds: [ETHEREUM_NETWORK_ID] });

			expect(result).toEqual(new Set(['0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', 'eth']));
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

		it('should preserve original case for Solana contract addresses', async () => {
			vi.mocked(nearIntentsApi.fetchNearIntentsTokens).mockResolvedValue(mockNearIntentsTokens);

			const result = await nearIntentsSupportedTokens({ networkIds: [SOLANA_MAINNET_NETWORK_ID] });

			expect(result).toEqual(new Set(['sol', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v']));
		});

		it('should return empty set when no tokens match the given network', async () => {
			vi.mocked(nearIntentsApi.fetchNearIntentsTokens).mockResolvedValue(mockNearIntentsTokens);

			const result = await nearIntentsSupportedTokens({
				networkIds: [parseNetworkId('unknown-network')]
			});

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

			expect(result.has('eth')).toBeTruthy();
			expect(result.has('ETH')).toBeFalsy();
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

			expect(result.has('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48')).toBeTruthy();
			expect(result.has('0xA0b86991C6218B36C1D19D4a2E9eB0cE3606eB48')).toBeFalsy();
		});

		it('should use lowercased symbol for native BTC when filtering by BTC mainnet network', async () => {
			vi.mocked(nearIntentsApi.fetchNearIntentsTokens).mockResolvedValue(mockNearIntentsTokens);

			const result = await nearIntentsSupportedTokens({ networkIds: [BTC_MAINNET_NETWORK_ID] });

			expect(result).toEqual(new Set(['btc']));
		});

		it('should not treat the btc blockchain as EVM when a contract address is present', async () => {
			const btcTokenWithAddress: NearIntentsToken = {
				assetId: 'nep141:btc-MixedCaseAddress.omft.near',
				decimals: 8,
				blockchain: 'btc',
				symbol: 'WBTC',
				price: 65000.0,
				priceUpdatedAt: '2026-03-16T00:00:00.000Z',
				contractAddress: 'MixedCaseAddress'
			};

			vi.mocked(nearIntentsApi.fetchNearIntentsTokens).mockResolvedValue([btcTokenWithAddress]);

			const result = await nearIntentsSupportedTokens({ networkIds: [BTC_MAINNET_NETWORK_ID] });

			expect(result.has('MixedCaseAddress')).toBeTruthy();
			expect(result.has('mixedcaseaddress')).toBeFalsy();
		});

		it('should keep Solana contract addresses case-sensitive (Base58)', async () => {
			vi.mocked(nearIntentsApi.fetchNearIntentsTokens).mockResolvedValue(mockNearIntentsTokens);

			const result = await nearIntentsSupportedTokens({ networkIds: [SOLANA_MAINNET_NETWORK_ID] });

			expect(result.has('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')).toBeTruthy();
			expect(result.has('epjfwdd5aufqssqem2qn1xzybapc8g4weggkzwytdt1v')).toBeFalsy();
		});
	});
});
