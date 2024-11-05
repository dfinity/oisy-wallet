import { ETHEREUM_TOKEN_ID, ICP_TOKEN_ID } from '$env/tokens.env';
import type { IcTransactionUi } from '$icp/types/ic';
import { initTransactionsStore } from '$lib/stores/transactions.store';
import { createCertifiedIcTransactionUiMock } from '$tests/utils/transactions-stores.test-utils';

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

		it('should duplicate transactions with same id', () =>
			new Promise<void>((done) => {
				const store = initTransactionsStore<IcTransactionUi>();

				const tx = createCertifiedIcTransactionUiMock('tx1');
				store.append({ tokenId, transactions: [tx] });

				const newTx = [createCertifiedIcTransactionUiMock('tx2')];
				store.append({ tokenId, transactions: newTx });

				store.append({ tokenId, transactions: [tx] });

				store.subscribe((state) => {
					expect(state?.[tokenId]).toHaveLength(3);
					expect(
						(state?.[tokenId] ?? []).filter(({ data: { id } }) => id === tx.data.id)
					).toHaveLength(2);

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
