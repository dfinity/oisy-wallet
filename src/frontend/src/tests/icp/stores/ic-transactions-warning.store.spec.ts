import { icTransactionsWarningStore } from '$icp/stores/ic-transactions-warning.store';
import type { IcToken } from '$icp/types/ic-token';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { get } from 'svelte/store';

describe('ic-transactions-warning.store', () => {
	const token: IcToken = { ...mockValidIcToken, ledgerCanisterId: 'mxzaz-hqaaa-aaaar-qaada-cai' };

	beforeEach(() => {
		icTransactionsWarningStore.reset();
	});

	it('should record the dismissal by Ledger canister ID', () => {
		icTransactionsWarningStore.dismiss([token]);

		expect(get(icTransactionsWarningStore)).toStrictEqual([token.ledgerCanisterId]);
	});

	it('should not record the same token twice', () => {
		icTransactionsWarningStore.dismiss([token]);
		icTransactionsWarningStore.dismiss([token]);

		expect(get(icTransactionsWarningStore)).toStrictEqual([token.ledgerCanisterId]);
	});

	it('should forget a dismissed token', () => {
		icTransactionsWarningStore.dismiss([token]);

		icTransactionsWarningStore.forget([token.ledgerCanisterId]);

		expect(get(icTransactionsWarningStore)).toStrictEqual([]);
	});

	it('should not notify when there is nothing to forget', () => {
		const notified = vi.fn();
		const unsubscribe = icTransactionsWarningStore.subscribe(notified);

		// The caller passes every recovered token on every change, so this is the common path.
		icTransactionsWarningStore.forget(['mxzaz-hqaaa-aaaar-qaada-cai', 'other-ledger']);

		// Only the subscription's own initial call.
		expect(notified).toHaveBeenCalledOnce();

		unsubscribe();
	});

	it('should notify when a dismissal is actually forgotten', () => {
		icTransactionsWarningStore.dismiss([token]);

		const notified = vi.fn();
		const unsubscribe = icTransactionsWarningStore.subscribe(notified);

		icTransactionsWarningStore.forget([token.ledgerCanisterId]);

		expect(notified).toHaveBeenCalledTimes(2);

		unsubscribe();
	});
});
