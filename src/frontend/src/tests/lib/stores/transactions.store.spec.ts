import { ETHEREUM_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN_ID } from '$env/tokens/tokens.icp.env';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import { ZERO } from '$lib/constants/app.constants';
import { initTransactionsStore } from '$lib/stores/transactions.store';
import type { Transaction } from '$lib/types/transaction';
import { bn3Bi } from '$tests/mocks/balances.mock';
import { createMockEthCertifiedTransactions } from '$tests/mocks/eth-transactions.mock';
import { createCertifiedIcTransactionUiMock } from '$tests/utils/transactions-stores.test-utils';
import { get } from 'svelte/store';

describe('transactions.store', () => {
	const tokenId = ICP_TOKEN_ID;

	describe('prepend', () => {
		it('should add transactions at the beginning of the list', () =>
			new Promise<void>((done) => {
				const store = initTransactionsStore<IcTransactionUi>();

				const initialTx = [createCertifiedIcTransactionUiMock('tx1')];
				store.prepend({ tokenId, transactions: initialTx });

				const newTx = [createCertifiedIcTransactionUiMock('tx2')];
				store.prepend({ tokenId, transactions: newTx });

				store.subscribe((state) => {
					expect(state?.[tokenId]).toHaveLength(2);
					expect(state?.[tokenId]?.[0].data.id).toBe('tx2');
					expect(state?.[tokenId]?.[1].data.id).toBe('tx1');

					done();
				})();
			}));

		it('should deduplicate transactions with same id', () =>
			new Promise<void>((done) => {
				const store = initTransactionsStore<IcTransactionUi>();

				const tx = createCertifiedIcTransactionUiMock('tx1');
				store.prepend({ tokenId, transactions: [tx] });

				const newTx = [createCertifiedIcTransactionUiMock('tx2')];
				store.prepend({ tokenId, transactions: newTx });

				store.prepend({ tokenId, transactions: [tx] });

				store.subscribe((state) => {
					expect(state?.[tokenId]).toHaveLength(2);

					done();
				})();
			}));
	});

	describe('set', () => {
		const mockTransactions = [
			createCertifiedIcTransactionUiMock('tx1'),
			createCertifiedIcTransactionUiMock('tx2'),
			createCertifiedIcTransactionUiMock('tx3'),
			createCertifiedIcTransactionUiMock('tx4'),
			createCertifiedIcTransactionUiMock('tx5')
		];

		const mockOtherTransactions = [
			createCertifiedIcTransactionUiMock('tx6'),
			createCertifiedIcTransactionUiMock('tx7'),
			createCertifiedIcTransactionUiMock('tx8')
		];

		it('should set transactions for a specific token', () => {
			const store = initTransactionsStore<IcTransactionUi>();

			store.set({ tokenId, transactions: mockTransactions });

			const state = get(store);

			expect(state?.[tokenId]).toHaveLength(mockTransactions.length);
			expect(state?.[tokenId]).toEqual(mockTransactions);
		});

		it('should re-set transactions for a specific token even if already set', () => {
			const store = initTransactionsStore<IcTransactionUi>();

			store.set({ tokenId, transactions: mockTransactions });

			expect(get(store)?.[tokenId]).toHaveLength(mockTransactions.length);

			store.set({ tokenId, transactions: mockOtherTransactions });

			const state = get(store);

			expect(state?.[tokenId]).toHaveLength(mockOtherTransactions.length);
			expect(state?.[tokenId]).toEqual(mockOtherTransactions);
		});
	});

	describe('add', () => {
		const mockTransactions = [
			createCertifiedIcTransactionUiMock('tx1'),
			createCertifiedIcTransactionUiMock('tx2'),
			createCertifiedIcTransactionUiMock('tx3'),
			createCertifiedIcTransactionUiMock('tx4'),
			createCertifiedIcTransactionUiMock('tx5')
		];

		const mockOtherTransactions = [
			createCertifiedIcTransactionUiMock('tx6'),
			createCertifiedIcTransactionUiMock('tx7'),
			createCertifiedIcTransactionUiMock('tx8')
		];

		const store = initTransactionsStore<IcTransactionUi>();

		beforeEach(() => {
			store.set({ tokenId, transactions: mockTransactions });
		});

		it('should add transactions at the end of the list', () => {
			store.add({ tokenId, transactions: mockOtherTransactions });

			const state = get(store);

			expect(state?.[tokenId]).toHaveLength(mockTransactions.length + mockOtherTransactions.length);
			expect(state?.[tokenId]).toEqual([...mockTransactions, ...mockOtherTransactions]);
		});

		// TODO: un-skip this test when we implement the resetAll method
		it.skip('should add transactions even if the list is empty', () => {
			// store.resetAll();
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

	describe('append', () => {
		it('should add transactions at the end of the list', () =>
			new Promise<void>((done) => {
				const store = initTransactionsStore<IcTransactionUi>();

				const tx1 = [createCertifiedIcTransactionUiMock('tx1')];
				store.append({ tokenId, transactions: tx1 });

				const tx2 = [createCertifiedIcTransactionUiMock('tx2')];
				store.append({ tokenId, transactions: tx2 });

				store.subscribe((state) => {
					expect(state?.[tokenId]).toHaveLength(2);
					expect(state?.[tokenId]?.[0].data.id).toBe('tx1');
					expect(state?.[tokenId]?.[1].data.id).toBe('tx2');

					done();
				})();
			}));

		it('should not duplicate transactions with same id', () =>
			new Promise<void>((done) => {
				const store = initTransactionsStore<IcTransactionUi>();

				const tx = createCertifiedIcTransactionUiMock('tx1');
				store.append({ tokenId, transactions: [tx] });

				const newTx = [createCertifiedIcTransactionUiMock('tx2')];
				store.append({ tokenId, transactions: newTx });

				store.append({ tokenId, transactions: [tx] });

				store.subscribe((state) => {
					expect(state?.[tokenId]).toHaveLength(2);
					expect(
						(state?.[tokenId] ?? []).filter(({ data: { id } }) => id === tx.data.id)
					).toHaveLength(1);

					done();
				})();
			}));
	});

	describe('cleanUp', () => {
		it('should remove specified transactions', () =>
			new Promise<void>((done) => {
				const store = initTransactionsStore<IcTransactionUi>();

				const transactions = [
					createCertifiedIcTransactionUiMock('tx1'),
					createCertifiedIcTransactionUiMock('tx2'),
					createCertifiedIcTransactionUiMock('tx3')
				];

				store.append({ tokenId, transactions });
				store.cleanUp({ tokenId, transactionIds: ['tx1', 'tx3'] });

				store.subscribe((state) => {
					expect(state?.[tokenId]).toHaveLength(1);
					expect(state?.[tokenId]?.[0].data.id).toBe('tx2');

					done();
				})();
			}));

		it('should do nothing if specified transactions do no exist', () =>
			new Promise<void>((done) => {
				const store = initTransactionsStore<IcTransactionUi>();

				const transactions = [
					createCertifiedIcTransactionUiMock('tx1'),
					createCertifiedIcTransactionUiMock('tx2'),
					createCertifiedIcTransactionUiMock('tx3')
				];

				store.append({ tokenId, transactions });
				store.cleanUp({ tokenId, transactionIds: ['tx4', 'tx5'] });

				store.subscribe((state) => {
					expect(state?.[tokenId]).toHaveLength(3);

					done();
				})();
			}));
	});

	describe('update', () => {
		const mockTransactions = [
			createCertifiedIcTransactionUiMock('tx1'),
			createCertifiedIcTransactionUiMock('tx2'),
			createCertifiedIcTransactionUiMock('tx3'),
			createCertifiedIcTransactionUiMock('tx4'),
			createCertifiedIcTransactionUiMock('tx5')
		];

		const updatedTransaction = {
			...mockTransactions[0],
			value: (mockTransactions[0].data.value ?? ZERO) + bn3Bi
		};

		const store = initTransactionsStore<IcTransactionUi>();

		beforeEach(() => {
			store.set({ tokenId, transactions: mockTransactions });
		});

		it('should update a transaction with the same id', () => {
			store.update({ tokenId, transaction: updatedTransaction });

			const state = get(store);

			expect(state?.[tokenId]).toHaveLength(mockTransactions.length);
			expect(state?.[tokenId]).toEqual([...mockTransactions.slice(1), updatedTransaction]);
		});

		it('should update a transaction with the same hash', () => {
			const mockTransactions = createMockEthCertifiedTransactions(5);
			const store = initTransactionsStore<Transaction>();
			store.set({ tokenId, transactions: mockTransactions });

			const updatedTransaction = {
				...mockTransactions[0],
				value: (mockTransactions[0].data.value ?? ZERO) + bn3Bi
			};

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

	describe('reset', () => {
		it('should clear all transactions', () =>
			new Promise<void>((done) => {
				const store = initTransactionsStore<IcTransactionUi>();

				const transactions = [createCertifiedIcTransactionUiMock('tx1')];
				store.append({ tokenId, transactions });
				store.reset(tokenId);

				store.subscribe((state) => {
					expect(state).toEqual({ [tokenId]: null });

					done();
				})();
			}));

		it('should not clear other token transactions', () =>
			new Promise<void>((done) => {
				const store = initTransactionsStore<IcTransactionUi>();

				const transactions = [createCertifiedIcTransactionUiMock('tx1')];
				store.append({ tokenId, transactions });
				store.reset(ETHEREUM_TOKEN_ID);

				store.subscribe((state) => {
					expect(state?.[tokenId]).toHaveLength(1);

					done();
				})();
			}));
	});

	describe('nullify', () => {
		it('should set no transactions', () =>
			new Promise<void>((done) => {
				const store = initTransactionsStore<IcTransactionUi>();

				store.nullify(tokenId);

				store.subscribe((state) => {
					expect(state).toEqual({ [tokenId]: null });

					done();
				})();
			}));

		it('should not clear other token transactions', () =>
			new Promise<void>((done) => {
				const store = initTransactionsStore<IcTransactionUi>();

				const transactions = [createCertifiedIcTransactionUiMock('tx1')];
				store.append({ tokenId: ETHEREUM_TOKEN_ID, transactions });
				store.nullify(tokenId);

				store.subscribe((state) => {
					expect(state?.[ETHEREUM_TOKEN_ID]).toHaveLength(1);

					done();
				})();
			}));

		it('should prepend transactions if previously null', () =>
			new Promise<void>((done) => {
				const store = initTransactionsStore<IcTransactionUi>();

				store.nullify(tokenId);

				const initialTx = [createCertifiedIcTransactionUiMock('tx1')];
				store.prepend({ tokenId, transactions: initialTx });

				store.subscribe((state) => {
					expect(state?.[tokenId]).toHaveLength(1);
					expect(state?.[tokenId]?.[0].data.id).toBe('tx1');

					done();
				})();
			}));

		it('should append transactions if previously null', () =>
			new Promise<void>((done) => {
				const store = initTransactionsStore<IcTransactionUi>();

				store.nullify(tokenId);

				const initialTx = [createCertifiedIcTransactionUiMock('tx1')];
				store.append({ tokenId, transactions: initialTx });

				store.subscribe((state) => {
					expect(state?.[tokenId]).toHaveLength(1);
					expect(state?.[tokenId]?.[0].data.id).toBe('tx1');

					done();
				})();
			}));
	});
});
