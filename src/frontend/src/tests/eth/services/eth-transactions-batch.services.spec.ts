import { PEPE_TOKEN, PEPE_TOKEN_ID } from '$env/tokens-erc20/tokens.pepe.env';
import { USDC_TOKEN, USDC_TOKEN_ID } from '$env/tokens-erc20/tokens.usdc.env';
import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens.env';
import { batchLoadEthereumTransactions } from '$eth/services/eth-transactions-batch.services';
import * as transactionsServices from '$eth/services/eth-transactions.services';
import type { NetworkId } from '$lib/types/network';
import type { Token, TokenId } from '$lib/types/token';

describe('eth-transactions-batch.services', () => {
	describe('batchLoadEthereumTransactions', () => {
		const tokensToLoad = [ETHEREUM_TOKEN, SEPOLIA_TOKEN] as Token[];
		const tokensLoaded = [] as TokenId[];
		const maxCallsPerSecond = 2;

		const mockLoadEthereumTransactions = vi.fn();

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(transactionsServices, 'loadEthereumTransactions').mockImplementation(
				mockLoadEthereumTransactions
			);
		});

		it('should process tokens in batches based on maxCallsPerSecond', async () => {
			const generator = batchLoadEthereumTransactions({
				tokensToLoad: [...tokensToLoad, USDC_TOKEN],
				tokensLoaded,
				maxCallsPerSecond
			});

			await generator.next();

			expect(mockLoadEthereumTransactions).toHaveBeenCalledTimes(2);
			expect(mockLoadEthereumTransactions).toHaveBeenCalledWith({
				tokenId: tokensToLoad[0].id,
				networkId: tokensToLoad[0].network.id
			});
			expect(mockLoadEthereumTransactions).toHaveBeenCalledWith({
				tokenId: tokensToLoad[1].id,
				networkId: tokensToLoad[1].network.id
			});

			await generator.next();

			expect(mockLoadEthereumTransactions).toHaveBeenCalledTimes(3);
			expect(mockLoadEthereumTransactions).toHaveBeenCalledWith({
				tokenId: USDC_TOKEN_ID,
				networkId: USDC_TOKEN.network.id
			});
		});

		it('should not call loadEthereumTransactions if all tokens are already loaded', async () => {
			const generator = batchLoadEthereumTransactions({
				tokensToLoad,
				tokensLoaded: tokensToLoad.map((token) => token.id),
				maxCallsPerSecond
			});

			await generator.next();

			expect(mockLoadEthereumTransactions).not.toHaveBeenCalled();

			const done = await generator.next();
			expect(done.done).toBe(true);
		});

		it('should update tokensLoaded with tokens that were successfully loaded', async () => {
			mockLoadEthereumTransactions.mockImplementation(
				// eslint-disable-next-line require-await
				async ({ tokenId }: { tokenId: TokenId; networkId: NetworkId }) => ({
					success: tokenId !== USDC_TOKEN_ID
				})
			);

			const generator = batchLoadEthereumTransactions({
				tokensToLoad: [...tokensToLoad, USDC_TOKEN, PEPE_TOKEN],
				tokensLoaded,
				maxCallsPerSecond
			});

			await generator.next();
			await generator.next();

			expect(tokensLoaded).toEqual([tokensToLoad[0].id, tokensToLoad[1].id, PEPE_TOKEN_ID]);
		});

		it('should skip tokens already in tokensLoaded', async () => {
			const tokensLoaded = [tokensToLoad[0].id];

			const generator = batchLoadEthereumTransactions({
				tokensToLoad,
				tokensLoaded,
				maxCallsPerSecond
			});

			await generator.next();

			expect(mockLoadEthereumTransactions).toHaveBeenCalledTimes(1);
			expect(mockLoadEthereumTransactions).toHaveBeenCalledWith({
				tokenId: tokensToLoad[1].id,
				networkId: tokensToLoad[1].network.id
			});
			expect(tokensLoaded).toEqual([tokensToLoad[0].id, tokensToLoad[1].id]);
		});

		it('should wait for delay between batches', async () => {
			const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

			const generator = batchLoadEthereumTransactions({
				tokensToLoad,
				tokensLoaded,
				maxCallsPerSecond: 1
			});

			await generator.next();
			await generator.next();

			expect(setTimeoutSpy).toHaveBeenCalledOnce();
			expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);

			setTimeoutSpy.mockRestore();
		});
	});
});
