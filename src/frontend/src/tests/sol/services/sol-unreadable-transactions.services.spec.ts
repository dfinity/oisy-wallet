import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { trackSolUnreadableTransaction } from '$sol/services/sol-transactions-analytics.services';
import { reportUnreadableSolTransactions } from '$sol/services/sol-unreadable-transactions.services';
import { solUnreadableTransactionsStore } from '$sol/stores/sol-unreadable-transactions.store';
import { mockSolSignatureResponse } from '$tests/mocks/sol-signatures.mock';
import { SOLANA_ERROR__JSON_RPC__SERVER_ERROR_UNSUPPORTED_TRANSACTION_VERSION } from '@solana/kit';
import { get } from 'svelte/store';

vi.mock('$sol/services/sol-transactions-analytics.services', () => ({
	trackSolUnreadableTransaction: vi.fn()
}));

describe('sol-unreadable-transactions.services', () => {
	const tokenId: TokenId = parseTokenId('tokenId');
	const tokenId2: TokenId = parseTokenId('tokenId2');

	const errorCode = SOLANA_ERROR__JSON_RPC__SERVER_ERROR_UNSUPPORTED_TRANSACTION_VERSION;
	const network = SOLANA_MAINNET_NETWORK;

	// The tracking is once per page load, so each test reports signatures no other test has.
	const unreadable = (tokenIds: TokenId[]) => ({
		signature: mockSolSignatureResponse().signature,
		errorCode,
		network,
		tokenIds
	});

	beforeEach(() => {
		vi.clearAllMocks();

		solUnreadableTransactionsStore.reset(tokenId);
		solUnreadableTransactionsStore.reset(tokenId2);
	});

	describe('reportUnreadableSolTransactions', () => {
		it('should hold each transaction for every token whose history is missing it', () => {
			const shared = unreadable([tokenId, tokenId2]);
			const own = unreadable([tokenId]);

			reportUnreadableSolTransactions({ transactions: [shared, own] });

			expect(get(solUnreadableTransactionsStore)[tokenId]).toEqual([
				shared.signature,
				own.signature
			]);
			expect(get(solUnreadableTransactionsStore)[tokenId2]).toEqual([shared.signature]);
		});

		it('should hold a transaction reported again for another token under that token too', () => {
			const transaction = unreadable([tokenId]);

			reportUnreadableSolTransactions({ transactions: [transaction] });
			reportUnreadableSolTransactions({ transactions: [{ ...transaction, tokenIds: [tokenId2] }] });

			expect(get(solUnreadableTransactionsStore)[tokenId]).toEqual([transaction.signature]);
			expect(get(solUnreadableTransactionsStore)[tokenId2]).toEqual([transaction.signature]);
		});

		it('should hold nothing for a transaction that belongs to no token', () => {
			reportUnreadableSolTransactions({ transactions: [unreadable([])] });

			expect(get(solUnreadableTransactionsStore)[tokenId]).toBeUndefined();
			expect(get(solUnreadableTransactionsStore)[tokenId2]).toBeUndefined();
		});

		it('should track each transaction once, with its network and the code it was refused with', () => {
			reportUnreadableSolTransactions({ transactions: [unreadable([tokenId, tokenId2])] });

			expect(trackSolUnreadableTransaction).toHaveBeenCalledExactlyOnceWith({ network, errorCode });
		});

		// The pagers meet a transaction again on every pass over its page.
		it('should not track a transaction again when it is reported again', () => {
			const transaction = unreadable([tokenId]);

			reportUnreadableSolTransactions({ transactions: [transaction] });
			reportUnreadableSolTransactions({ transactions: [{ ...transaction, tokenIds: [tokenId2] }] });

			expect(trackSolUnreadableTransaction).toHaveBeenCalledOnce();
		});

		it('should not track a transaction twice when it is listed twice', () => {
			const transaction = unreadable([tokenId]);

			reportUnreadableSolTransactions({ transactions: [transaction, transaction] });

			expect(trackSolUnreadableTransaction).toHaveBeenCalledOnce();
		});

		it('should track a transaction that belongs to no token', () => {
			reportUnreadableSolTransactions({ transactions: [unreadable([])] });

			expect(trackSolUnreadableTransaction).toHaveBeenCalledOnce();
		});

		it('should track nothing for no transactions', () => {
			reportUnreadableSolTransactions({ transactions: [] });

			expect(trackSolUnreadableTransaction).not.toHaveBeenCalled();
		});
	});
});
