import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { solUnreadableTransactionsStore } from '$sol/stores/sol-unreadable-transactions.store';
import { mockSolSignatureResponse } from '$tests/mocks/sol-signatures.mock';
import { get } from 'svelte/store';

describe('sol-unreadable-transactions.store', () => {
	const tokenId: TokenId = parseTokenId('tokenId');
	const tokenId2: TokenId = parseTokenId('tokenId2');

	const { signature } = mockSolSignatureResponse();
	const signature2 = mockSolSignatureResponse().signature;

	beforeEach(() => {
		solUnreadableTransactionsStore.reset(tokenId);
		solUnreadableTransactionsStore.reset(tokenId2);
	});

	describe('add', () => {
		it('should add the signatures of a token', () => {
			solUnreadableTransactionsStore.add({ tokenId, signatures: [signature, signature2] });

			expect(get(solUnreadableTransactionsStore)[tokenId]).toEqual([signature, signature2]);
		});

		it('should keep the signatures of each token apart', () => {
			solUnreadableTransactionsStore.add({ tokenId, signatures: [signature] });
			solUnreadableTransactionsStore.add({ tokenId: tokenId2, signatures: [signature2] });

			expect(get(solUnreadableTransactionsStore)[tokenId]).toEqual([signature]);
			expect(get(solUnreadableTransactionsStore)[tokenId2]).toEqual([signature2]);
		});

		it('should add a signature once however often it is added', () => {
			solUnreadableTransactionsStore.add({ tokenId, signatures: [signature, signature] });
			solUnreadableTransactionsStore.add({ tokenId, signatures: [signature, signature2] });

			expect(get(solUnreadableTransactionsStore)[tokenId]).toEqual([signature, signature2]);
		});

		it('should not notify the subscribers when nothing is new', () => {
			solUnreadableTransactionsStore.add({ tokenId, signatures: [signature] });

			const subscriber = vi.fn();

			const unsubscribe = solUnreadableTransactionsStore.subscribe(subscriber);

			subscriber.mockClear();

			solUnreadableTransactionsStore.add({ tokenId, signatures: [signature] });
			solUnreadableTransactionsStore.add({ tokenId, signatures: [] });

			expect(subscriber).not.toHaveBeenCalled();

			unsubscribe();
		});
	});

	describe('reset', () => {
		it('should remove the signatures of that token only', () => {
			solUnreadableTransactionsStore.add({ tokenId, signatures: [signature] });
			solUnreadableTransactionsStore.add({ tokenId: tokenId2, signatures: [signature2] });

			solUnreadableTransactionsStore.reset(tokenId);

			expect(get(solUnreadableTransactionsStore)[tokenId]).toBeUndefined();
			expect(get(solUnreadableTransactionsStore)[tokenId2]).toEqual([signature2]);
		});

		it('should not notify the subscribers for a token it holds nothing of', () => {
			const subscriber = vi.fn();

			const unsubscribe = solUnreadableTransactionsStore.subscribe(subscriber);

			subscriber.mockClear();

			solUnreadableTransactionsStore.reset(tokenId);

			expect(subscriber).not.toHaveBeenCalled();

			unsubscribe();
		});
	});
});
