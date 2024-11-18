import { USDC_TOKEN, USDC_TOKEN_ID } from '$env/tokens-erc20/tokens.usdc.env';
import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens.env';
import * as transactionsServices from '$eth/services/eth-transactions.services';
import {
	batchLoadEthereumTransactions,
	loadEthereumTransactions
} from '$eth/services/eth-transactions.services';
import type { Token, TokenId } from '$lib/types/token';
import { waitFor } from '@testing-library/svelte';
import { expect } from 'vitest';

describe('eth-transactions.services', () => {
	describe('batchLoadEthereumTransactions', () => {
		const tokensToLoad = [ETHEREUM_TOKEN, SEPOLIA_TOKEN] as Token[];
		const tokensLoaded = [] as TokenId[];
		const maxCallsPerSecond = 2;

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(transactionsServices, 'loadEthereumTransactions').mockResolvedValue({
				success: true
			});

			// vi.mock('$eth/services/eth-transactions.services', () => ({
			// 	loadEthereumTransactions: vi.fn()
			// }));

			// vi.mock(import('$eth/services/eth-transactions.services'), async (importOriginal) => {
			// 	const actual = await importOriginal();
			// 	return {
			// 		...actual,
			// 		loadEthereumTransactions: vi.fn()
			// 	};
			// });
		});

		it('should process tokens in batches based on maxCallsPerSecond', async () => {
			const generator = batchLoadEthereumTransactions({
				tokensToLoad: [...tokensToLoad, USDC_TOKEN],
				tokensLoaded,
				maxCallsPerSecond
			});

			await generator.next();

			expect(loadEthereumTransactions).toHaveBeenCalledTimes(2);

			await waitFor(
				() => {
					expect(loadEthereumTransactions).toHaveBeenCalledTimes(2);
					expect(loadEthereumTransactions).toHaveBeenCalledWith({
						tokenId: tokensToLoad[0].id,
						networkId: tokensToLoad[0].network.id
					});
					expect(loadEthereumTransactions).toHaveBeenCalledWith({
						tokenId: tokensToLoad[1].id,
						networkId: tokensToLoad[1].network.id
					});
				},
				{ timeout: 10000 }
			);

			await generator.next();

			await waitFor(
				() => {
					expect(loadEthereumTransactions).toHaveBeenCalledTimes(3);
					expect(loadEthereumTransactions).toHaveBeenCalledWith({
						tokenId: USDC_TOKEN_ID,
						networkId: USDC_TOKEN.network.id
					});
				},
				{ timeout: 10000 }
			);
		});

		it('should update tokensLoaded with tokens that were successfully loaded', async () => {
			const generator = batchLoadEthereumTransactions({
				tokensToLoad,
				tokensLoaded,
				maxCallsPerSecond
			});

			await generator.next();

			await waitFor(
				() => {
					expect(tokensLoaded).toEqual([tokensToLoad[0].id, tokensToLoad[1].id]);
				},
				{ timeout: 10000 }
			);
		});

		it('should skip tokens already in tokensLoaded', async () => {
			const tokensLoaded = [tokensToLoad[0].id];

			const generator = batchLoadEthereumTransactions({
				tokensToLoad,
				tokensLoaded,
				maxCallsPerSecond
			});

			await generator.next();

			await waitFor(
				() => {
					expect(loadEthereumTransactions).toHaveBeenCalledTimes(1);
					expect(loadEthereumTransactions).toHaveBeenCalledWith({
						tokenId: tokensToLoad[1].id,
						networkId: tokensToLoad[1].network.id
					});
					expect(tokensLoaded).toEqual([tokensToLoad[0].id, tokensToLoad[1].id]);
				},
				{ timeout: 10000 }
			);
		});

		it('should wait for delay between batches', async () => {
			vi.useFakeTimers();

			const generator = batchLoadEthereumTransactions({
				tokensToLoad,
				tokensLoaded,
				maxCallsPerSecond: 1
			});

			const nextPromise = generator.next();
			vi.runAllTimers();
			await nextPromise;

			expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);

			vi.clearAllTimers();
			vi.useRealTimers();
		});
	}, 60000);
});
