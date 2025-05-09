import { ICP_TOKEN_ID } from '$env/tokens/tokens.icp.env';
import { icPendingTransactionsStore } from '$icp/stores/ic-pending-transactions.store';
import { createCertifiedIcTransactionUiMock } from '$tests/utils/transactions-stores.test-utils';
import { get } from 'svelte/store';

describe('ic-pending-transactions.store', () => {
	describe('icPendingTransactionsStore', () => {
		const tokenId = ICP_TOKEN_ID;

		describe('prepend', () => {
			const store = icPendingTransactionsStore;

			beforeEach(() => {
				store.reset(tokenId);
			});

			it('should add transactions at the beginning of the list', () => {
				const initialTx = createCertifiedIcTransactionUiMock('tx1');
				store.prepend({ tokenId, transaction: initialTx });

				const newTx = createCertifiedIcTransactionUiMock('tx2');
				store.prepend({ tokenId, transaction: newTx });

				const state = get(store);

				expect(state?.[tokenId]).toHaveLength(2);
				expect(state?.[tokenId]).toStrictEqual([newTx, initialTx]);
			});

			it('should deduplicate transactions with same id', () => {
				const tx = createCertifiedIcTransactionUiMock('tx1');
				store.prepend({ tokenId, transaction: tx });

				const newTx = createCertifiedIcTransactionUiMock('tx2');
				store.prepend({ tokenId, transaction: newTx });

				store.prepend({ tokenId, transaction: tx });

				const state = get(store);

				expect(state?.[tokenId]).toHaveLength(2);
				expect(state?.[tokenId]).toStrictEqual([tx, newTx]);
			});
		});
	});
});
