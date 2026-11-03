import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import { transactionsStoreWithTokens } from '$lib/derived/transactions.derived';
import { balancesStore } from '$lib/stores/balances.store';
import { get } from 'svelte/store';

describe('transactions.derived', () => {
	describe('transactionsStoreWithTokens', () => {
		const checksIcp = (): boolean =>
			get(transactionsStoreWithTokens).some(({ tokens }) =>
				tokens.some(({ id }) => id === ICP_TOKEN.id)
			);

		beforeEach(() => {
			balancesStore.reinitialize();
			icTransactionsStore.clear(ICP_TOKEN.id);
		});

		it('should wait for an IC token that has not synced yet', () => {
			expect(checksIcp()).toBeTruthy();
		});

		it('should keep waiting for an IC token whose balance loaded but whose history did not', () => {
			balancesStore.set({ id: ICP_TOKEN.id, data: { data: 1n, certified: true } });

			expect(checksIcp()).toBeTruthy();
		});

		// Its ledger being down, say: the error path resets the balance and never writes a history, so
		// waiting for it held every check on the list, Activity's levelling included, for good.
		it('should stop waiting for an IC token whose first sync failed', () => {
			balancesStore.reset(ICP_TOKEN.id);

			expect(checksIcp()).toBeFalsy();
		});

		it('should check it again once its history arrives', () => {
			balancesStore.reset(ICP_TOKEN.id);

			icTransactionsStore.prepend({ tokenId: ICP_TOKEN.id, transactions: [] });

			expect(checksIcp()).toBeTruthy();
		});
	});
});
