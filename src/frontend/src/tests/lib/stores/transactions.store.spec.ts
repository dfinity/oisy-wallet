import { ETHEREUM_TOKEN_ID, ICP_TOKEN_ID } from '$env/tokens.env';
import type { IcTransactionUi } from '$icp/types/ic';
import { nowInBigIntNanoSeconds } from '$icp/utils/date.utils';
import { initTransactionsStore } from '$lib/stores/transactions.store';

describe('transactions.store', () => {
	const createMockTransaction = (id: string): IcTransactionUi => ({
		id,
		timestamp: nowInBigIntNanoSeconds(),
		type: 'send',
		value: BigInt(100),
		from: 'sender',
		to: 'receiver',
		status: 'pending'
	});

	const createCertifiedTransaction = (id: string) => ({
		certified: true,
		data: createMockTransaction(id)
	});

	const tokenId = ICP_TOKEN_ID;

	describe('prepend', () => {
		it('should add transactions at the beginning of the list', () =>
			new Promise<void>((done) => {
				const store = initTransactionsStore<IcTransactionUi>();

				const initialTx = [createCertifiedTransaction('tx1')];
				store.prepend({ tokenId, transactions: initialTx });

				const newTx = [createCertifiedTransaction('tx2')];
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

				const tx = createCertifiedTransaction('tx1');
				store.prepend({ tokenId, transactions: [tx] });

				const newTx = [createCertifiedTransaction('tx2')];
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

				const tx1 = [createCertifiedTransaction('tx1')];
				store.append({ tokenId, transactions: tx1 });

				const tx2 = [createCertifiedTransaction('tx2')];
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

				const tx = createCertifiedTransaction('tx1');
				store.append({ tokenId, transactions: [tx] });

				const newTx = [createCertifiedTransaction('tx2')];
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
					createCertifiedTransaction('tx1'),
					createCertifiedTransaction('tx2'),
					createCertifiedTransaction('tx3')
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
					createCertifiedTransaction('tx1'),
					createCertifiedTransaction('tx2'),
					createCertifiedTransaction('tx3')
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

				const transactions = [createCertifiedTransaction('tx1')];
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

				const transactions = [createCertifiedTransaction('tx1')];
				store.append({ tokenId, transactions });
				store.reset(ETHEREUM_TOKEN_ID);

				store.subscribe((state) => {
					expect(state?.[tokenId]).toHaveLength(1);

					done();
				})();
			}));
	});
});
