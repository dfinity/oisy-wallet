import { ETHEREUM_TOKEN_ID, SEPOLIA_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import { bn3Bi } from '$tests/mocks/balances.mock';
import { createMockEthCertifiedTransactions } from '$tests/mocks/eth-transactions.mock';
import { get } from 'svelte/store';

describe('eth-transactions.store', () => {
	const tokenId = ETHEREUM_TOKEN_ID;

	const mockTransactions = createMockEthCertifiedTransactions(5);

	const mockOtherTransactions = createMockEthCertifiedTransactions(3);

	const store = ethTransactionsStore;

	beforeEach(() => {
		store.resetAll();
	});

	describe('set', () => {
		it('should set transactions for a specific token', () => {
			store.set({ tokenId, transactions: mockTransactions });

			const state = get(store);

			expect(state?.[tokenId]).toHaveLength(mockTransactions.length);
			expect(state?.[tokenId]).toEqual(mockTransactions);
		});

		it('should re-set transactions for a specific token even if already set', () => {
			store.set({ tokenId, transactions: mockTransactions });

			expect(get(store)?.[tokenId]).toHaveLength(mockTransactions.length);

			store.set({ tokenId, transactions: mockOtherTransactions });

			const state = get(store);

			expect(state?.[tokenId]).toHaveLength(mockOtherTransactions.length);
			expect(state?.[tokenId]).toEqual(mockOtherTransactions);
		});
	});

	describe('add', () => {
		beforeEach(() => {
			store.set({ tokenId, transactions: mockTransactions });
		});

		it('should add transactions at the end of the list', () => {
			store.add({ tokenId, transactions: mockOtherTransactions });

			const state = get(store);

			expect(state?.[tokenId]).toHaveLength(mockTransactions.length + mockOtherTransactions.length);
			expect(state?.[tokenId]).toEqual([...mockTransactions, ...mockOtherTransactions]);
		});

		it('should add transactions even if the list is empty', () => {
			store.resetAll();
			store.add({ tokenId, transactions: mockOtherTransactions });

			const state = get(store);

			expect(state?.[tokenId]).toHaveLength(mockOtherTransactions.length);
			expect(state?.[tokenId]).toEqual(mockOtherTransactions);
		});

		it('should duplicate transactions with same id', () => {
			store.add({ tokenId, transactions: mockTransactions });

			const state = get(store);

			expect(state?.[tokenId]).toHaveLength(2 * mockTransactions.length);
			expect(state?.[tokenId]).toEqual([...mockTransactions, ...mockTransactions]);
		});
	});

	describe('update', () => {
		const updatedTransaction = {
			...mockTransactions[0],
			value: mockTransactions[0].data.value + bn3Bi
		};

		beforeEach(() => {
			store.set({ tokenId, transactions: mockTransactions });
		});

		it('should update a transaction with the same hash', () => {
			store.update({ tokenId, transaction: updatedTransaction });

			const state = get(store);

			expect(state?.[tokenId]).toHaveLength(mockTransactions.length);
			expect(state?.[tokenId]).toEqual([...mockTransactions.slice(1), updatedTransaction]);
		});

		it('should add a transaction that does not exist in the list', () => {
			store.set({ tokenId, transactions: mockTransactions.slice(1) });

			const updatedTransaction = { ...mockTransactions[0], hash: 'new-hash' };
			store.update({ tokenId, transaction: updatedTransaction });

			const state = get(store);

			expect(state?.[tokenId]).toHaveLength(mockTransactions.length);
			expect(state?.[tokenId]).toEqual([...mockTransactions.slice(1), updatedTransaction]);
		});

		it('should not duplicate transactions with same id', () => {
			store.update({ tokenId, transaction: updatedTransaction });

			const state = get(store);

			expect(state?.[tokenId]).toHaveLength(mockTransactions.length);
			expect(state?.[tokenId]).toEqual([...mockTransactions.slice(1), updatedTransaction]);
		});
	});

	describe('nullify', () => {
		beforeEach(() => {
			store.set({ tokenId, transactions: mockTransactions });
		});

		it('should set no transactions', () => {
			store.nullify(tokenId);

			expect(get(store)).toEqual({ [tokenId]: null });
		});

		it('should not clear other token transactions', () => {
			store.set({ tokenId: SEPOLIA_TOKEN_ID, transactions: mockOtherTransactions });
			store.nullify(tokenId);

			expect(get(store)).toEqual({ [tokenId]: null, [SEPOLIA_TOKEN_ID]: mockOtherTransactions });
		});
	});

	describe('reset', () => {
		it('should clear all transactions of all tokens', () => {
			store.set({ tokenId, transactions: mockTransactions });
			store.set({ tokenId: SEPOLIA_TOKEN_ID, transactions: mockOtherTransactions });

			expect(get(store)).toEqual({
				[tokenId]: mockTransactions,
				[SEPOLIA_TOKEN_ID]: mockOtherTransactions
			});

			store.resetAll();

			expect(get(store)).toEqual({});
		});
	});
});
