import { ICP_TOKEN_ID } from '$env/tokens/tokens.icp.env';
import { onLoadTransactionsError } from '$icp/services/ic-transactions.services';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import { balancesStore } from '$lib/stores/balances.store';
import { i18n } from '$lib/stores/i18n.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { bn1 } from '$tests/mocks/balances.mock';
import { createMockIcTransactionsUi } from '$tests/mocks/ic-transactions.mock';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

describe('ic-transactions.services', () => {
	describe('onLoadTransactionsError', () => {
		const tokenId = ICP_TOKEN_ID;
		const mockError = new Error('Test error');
		const mockTransactions = createMockIcTransactionsUi(5).map((transaction) => ({
			data: transaction,
			certified: false
		}));

		let spyToastsError: MockInstance;

		beforeEach(() => {
			vi.clearAllMocks();

			spyToastsError = vi.spyOn(toastsStore, 'toastsError');

			icTransactionsStore.append({ tokenId, transactions: mockTransactions });
			balancesStore.set({ tokenId, data: { data: bn1, certified: false } });
		});

		it('should reset transactions store and balances store', () => {
			onLoadTransactionsError({ tokenId, error: mockError });

			expect(get(icTransactionsStore)?.[tokenId]).toBeNull();
			expect(get(balancesStore)?.[tokenId]).toBeNull();
		});

		it('should call not display a toast if silent', () => {
			onLoadTransactionsError({ tokenId, error: mockError, silent: true });

			expect(spyToastsError).not.toHaveBeenCalled();
		});

		it('should log error to console when silent', () => {
			onLoadTransactionsError({ tokenId, error: mockError, silent: true });

			expect(console.warn).toHaveBeenCalledWith(
				`${get(i18n).transactions.error.loading_transactions}:`,
				mockError
			);
		});

		it('should call toastsError by default', () => {
			onLoadTransactionsError({ tokenId, error: mockError });

			expect(spyToastsError).toHaveBeenCalledWith({
				msg: { text: get(i18n).transactions.error.loading_transactions },
				err: mockError
			});
		});

		it('should handle a nullish error', () => {
			onLoadTransactionsError({ tokenId, error: null });

			expect(spyToastsError).toHaveBeenCalledWith({
				msg: { text: get(i18n).transactions.error.loading_transactions },
				err: null
			});

			onLoadTransactionsError({ tokenId, error: undefined, silent: true });

			expect(console.warn).toHaveBeenCalledWith(
				`${get(i18n).transactions.error.loading_transactions}:`,
				undefined
			);
		});
	});
});
