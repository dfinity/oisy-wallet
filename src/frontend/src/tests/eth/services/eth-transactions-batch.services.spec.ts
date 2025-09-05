import { ETHERSCAN_MAX_CALLS_PER_SECOND } from '$env/rest/etherscan.env';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import {
	batchLoadTransactions,
	batchResultsToTokenId,
	type ResultByToken
} from '$eth/services/eth-transactions-batch.services';
import { loadEthereumTransactions } from '$eth/services/eth-transactions.services';
import * as batchServices from '$lib/services/batch.services';
import { batch } from '$lib/services/batch.services';

vi.mock('$eth/services/eth-transactions.services', () => ({
	loadEthereumTransactions: vi.fn()
}));

describe('eth-transactions-batch.services', () => {
	describe('batchLoadTransactions', () => {
		const mockTokensNotLoaded = [ETHEREUM_TOKEN, SEPOLIA_TOKEN];
		const mockTokensAlreadyLoaded = [USDC_TOKEN];

		const mockTokens = [...mockTokensNotLoaded, ...mockTokensAlreadyLoaded];

		const mockTokensAlreadyLoadedIds = mockTokensAlreadyLoaded.map((token) => token.id);

		const mockTransactionResult = { success: true };

		const expectedReturn: PromiseSettledResult<ResultByToken>[] = mockTokensNotLoaded.map(
			(token) => ({
				status: 'fulfilled',
				value: { ...mockTransactionResult, tokenId: token.id }
			})
		);

		const mockError = new Error('Failed to load transactions');

		const batchSpy = vi.spyOn(batchServices, 'batch');

		beforeEach(() => {
			vi.clearAllMocks();
			vi.resetAllMocks;
		});

		it('should create promises for tokens not already loaded', async () => {
			vi.mocked(loadEthereumTransactions).mockImplementation(({ tokenId }) =>
				Promise.resolve({ ...mockTransactionResult, tokenId })
			);

			const generator = batchLoadTransactions({
				tokens: mockTokens,
				tokensAlreadyLoaded: mockTokensAlreadyLoadedIds
			});

			const result = await generator.next();

			expect(loadEthereumTransactions).toHaveBeenCalledTimes(mockTokensNotLoaded.length);

			mockTokensNotLoaded.forEach((token) => {
				expect(loadEthereumTransactions).toHaveBeenCalledWith({
					tokenId: token.id,
					networkId: token.network.id,
					standard: token.standard
				});
			});

			expect(batchSpy).toHaveBeenCalledWith({
				promises: expect.any(Array),
				batchSize: expect.any(Number)
			});

			expect(result.value).toEqual(expectedReturn);
		});

		it('should not call loadEthereumTransactions for tokens already loaded', () => {
			batchLoadTransactions({
				tokens: mockTokens,
				tokensAlreadyLoaded: mockTokensAlreadyLoadedIds
			});

			mockTokensAlreadyLoaded.forEach((token) => {
				expect(loadEthereumTransactions).not.toHaveBeenCalledWith({
					tokenId: token.id,
					networkId: token.network.id,
					standard: token.standard
				});
			});
		});

		it('should handle rejected promises gracefully', async () => {
			vi.mocked(loadEthereumTransactions).mockImplementationOnce(({ tokenId }) =>
				tokenId === mockTokensNotLoaded[0].id
					? Promise.reject(mockError)
					: Promise.resolve({ ...mockTransactionResult, tokenId })
			);

			const expectedReturn = [
				{ status: 'rejected', reason: mockError },
				...mockTokens.slice(1).map((token) => ({
					status: 'fulfilled',
					value: { ...mockTransactionResult, tokenId: token.id }
				}))
			];

			const generator = batchLoadTransactions({
				tokens: mockTokens,
				tokensAlreadyLoaded: []
			});

			expect(batch).toHaveBeenCalled();

			const firstBatchResult = await generator.next();

			expect(firstBatchResult.value).toEqual(
				expectedReturn.slice(0, ETHERSCAN_MAX_CALLS_PER_SECOND)
			);

			const secondBatchResult = await generator.next();

			expect(secondBatchResult.value).toEqual(expectedReturn.slice(ETHERSCAN_MAX_CALLS_PER_SECOND));
		});

		it('should respect ETHERSCAN_MAX_CALLS_PER_SECOND as batchSize', () => {
			batchLoadTransactions({
				tokens: mockTokens,
				tokensAlreadyLoaded: []
			});

			expect(batch).toHaveBeenCalledWith({
				promises: expect.any(Array),
				batchSize: ETHERSCAN_MAX_CALLS_PER_SECOND
			});
		});
	});

	describe('batchResultsToTokenId', () => {
		const mockTokenId1 = Symbol('token1');
		const mockTokenId2 = Symbol('token2');

		const mockResults = [
			{
				status: 'fulfilled',
				value: { success: true, tokenId: mockTokenId1 }
			},
			{
				status: 'fulfilled',
				value: { success: true, tokenId: mockTokenId2 }
			}
		] as PromiseSettledResult<ResultByToken>[];

		it('should return an empty array when all promises are rejected', () => {
			const results = [
				{ status: 'rejected', reason: new Error('Error 1') },
				{ status: 'rejected', reason: new Error('Error 2') }
			] as PromiseSettledResult<ResultByToken>[];

			expect(batchResultsToTokenId(results)).toEqual([]);
		});

		it('should return an array of tokenIds for successful results', () => {
			expect(batchResultsToTokenId(mockResults)).toEqual([mockTokenId1, mockTokenId2]);
		});

		it('should skip results that are fulfilled but not successful', () => {
			const results = [
				{
					status: 'fulfilled',
					value: { success: false, tokenId: mockTokenId1 }
				},
				{
					status: 'fulfilled',
					value: { success: true, tokenId: mockTokenId2 }
				}
			] as PromiseSettledResult<ResultByToken>[];

			expect(batchResultsToTokenId(results)).toEqual([mockTokenId2]);
		});

		it('should skip both rejected results and unsuccessful fulfilled results', () => {
			const results = [
				{ status: 'rejected', reason: new Error('Error 1') },
				{
					status: 'fulfilled',
					value: { success: false, tokenId: mockTokenId1 }
				},
				{
					status: 'fulfilled',
					value: { success: true, tokenId: mockTokenId2 }
				}
			] as PromiseSettledResult<ResultByToken>[];
			const result = batchResultsToTokenId(results);

			expect(result).toEqual([mockTokenId2]);
		});
	});
});
