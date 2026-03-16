import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import type { Erc20Token } from '$eth/types/erc20';
import * as nearIntentsApi from '$lib/rest/near-intents.rest';
import {
	clearNearIntentsTokensCache,
	fetchNearIntentsSwapQuote,
	loadNearIntentsTokens,
	mapNearIntentsQuoteResult,
	pollNearIntentsStatus,
	submitNearIntentsDepositTx
} from '$lib/services/near-intents.services';
import { SwapProvider } from '$lib/types/swap';
import { mockValidErc20Token } from '$tests/mocks/erc20-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import {
	mockNearIntentsQuoteResponse,
	mockNearIntentsStatusFailed,
	mockNearIntentsStatusPending,
	mockNearIntentsStatusSuccess,
	mockNearIntentsTokens
} from '$tests/mocks/near-intents.mock';

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

			expect(result.provider).toBe(SwapProvider.NEAR_INTENTS);

			assert(result.provider === SwapProvider.NEAR_INTENTS);

			expect(result.receiveAmount).toBe(BigInt(mockNearIntentsQuoteResponse.quote.amountOut));
			expect(result.receiveOutMinimum).toBe(
				BigInt(mockNearIntentsQuoteResponse.quote.minAmountOut ?? '0')
			);
			expect(result.swapDetails).toBe(mockNearIntentsQuoteResponse);
		});

		it('should set receiveOutMinimum to undefined when minAmountOut is absent', () => {
			const quoteWithoutMin = {
				...mockNearIntentsQuoteResponse,
				quote: { ...mockNearIntentsQuoteResponse.quote, minAmountOut: undefined }
			};

			const result = mapNearIntentsQuoteResult(quoteWithoutMin);

			assert(result.provider === SwapProvider.NEAR_INTENTS);

			expect(result.receiveOutMinimum).toBeUndefined();
		});
	});

	describe('fetchNearIntentsSwapQuote', () => {
		const sourceToken: Erc20Token = {
			...mockValidErc20Token,
			network: { ...ETHEREUM_NETWORK, name: 'ETH' },
			address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
		};

		const destinationToken: Erc20Token = {
			...mockValidErc20Token,
			network: { ...mockValidErc20Token.network, name: 'ARB' },
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
				userEthAddress: mockEthAddress
			});

			expect(result).not.toBeNull();
			expect(result?.provider).toBe(SwapProvider.NEAR_INTENTS);
			expect(result?.receiveAmount).toBe(BigInt(mockNearIntentsQuoteResponse.quote.amountOut));
		});

		it('should call the API with dry: true and EXACT_INPUT swap type', async () => {
			vi.mocked(nearIntentsApi.fetchNearIntentsQuote).mockResolvedValue(
				mockNearIntentsQuoteResponse
			);

			await fetchNearIntentsSwapQuote({
				sourceToken,
				destinationToken,
				amount: 1_000_000n,
				userEthAddress: mockEthAddress
			});

			expect(nearIntentsApi.fetchNearIntentsQuote).toHaveBeenCalledWith(
				expect.objectContaining({
					dry: true,
					swapType: 'EXACT_INPUT',
					slippageTolerance: 100,
					originAsset: 'nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near',
					destinationAsset: 'nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near',
					amount: '1000000',
					recipient: mockEthAddress,
					refundTo: mockEthAddress
				})
			);
		});

		it('should return null when userEthAddress is nullish', async () => {
			const result = await fetchNearIntentsSwapQuote({
				sourceToken,
				destinationToken,
				amount: 1_000_000n,
				userEthAddress: undefined
			});

			expect(result).toBeNull();
			expect(nearIntentsApi.fetchNearIntentsQuote).not.toHaveBeenCalled();
		});

		it('should return null when source token blockchain is unsupported', async () => {
			const unsupportedToken: Erc20Token = {
				...sourceToken,
				network: { ...sourceToken.network, name: 'UNSUPPORTED' }
			};

			const result = await fetchNearIntentsSwapQuote({
				sourceToken: unsupportedToken,
				destinationToken,
				amount: 1_000_000n,
				userEthAddress: mockEthAddress
			});

			expect(result).toBeNull();
		});

		it('should return null when source token is not found in NEAR Intents tokens', async () => {
			const unknownToken: Erc20Token = {
				...sourceToken,
				address: '0xUnknownContractAddress'
			};

			const result = await fetchNearIntentsSwapQuote({
				sourceToken: unknownToken,
				destinationToken,
				amount: 1_000_000n,
				userEthAddress: mockEthAddress
			});

			expect(result).toBeNull();
		});

		it('should return null when destination token is not found in NEAR Intents tokens', async () => {
			const unknownDest: Erc20Token = {
				...destinationToken,
				address: '0xUnknownDestAddress'
			};

			const result = await fetchNearIntentsSwapQuote({
				sourceToken,
				destinationToken: unknownDest,
				amount: 1_000_000n,
				userEthAddress: mockEthAddress
			});

			expect(result).toBeNull();
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

			await expect(pollNearIntentsStatus({ depositAddress: '0xDeposit' })).rejects.toThrowError(
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
});
