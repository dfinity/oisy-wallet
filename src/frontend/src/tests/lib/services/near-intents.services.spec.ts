import { ARBITRUM_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import type { Erc20Token } from '$eth/types/erc20';
import * as nearIntentsApi from '$lib/rest/near-intents.rest';
import {
	clearNearIntentsTokensCache,
	fetchNearIntentsSwapQuote,
	loadNearIntentsTokens,
	pollNearIntentsStatus,
	submitNearIntentsDepositTx
} from '$lib/services/near-intents.services';
import { SwapProvider } from '$lib/types/swap';
import { mapNearIntentsQuoteResult } from '$lib/utils/swap.utils';
import { parseNetworkId } from '$lib/validation/network.validation';
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
				userEthAddress: mockEthAddress,
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
				userEthAddress: mockEthAddress,
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

		it('should return undefined when userEthAddress is nullish', async () => {
			const result = await fetchNearIntentsSwapQuote({
				sourceToken,
				destinationToken,
				amount: 1_000_000n,
				userEthAddress: undefined,
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
				userEthAddress: mockEthAddress,
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
				userEthAddress: mockEthAddress,
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
				userEthAddress: mockEthAddress,
				slippage
			});

			expect(result).toBeUndefined();
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
});
