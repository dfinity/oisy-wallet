import { icTransactions } from '$icp/derived/ic-transactions.derived';
import { mockCkBtcPendingUtxoTransaction } from '$tests/mocks/ckbtc.mock';
import { setupCkBTCStores } from '$tests/utils/ckbtc-stores.test-utils';
import { get } from 'svelte/store';

describe('ic-transactions.derived', () => {
	it('should return an empty array when all source stores are empty', () => {
		const result = get(icTransactions);
		expect(result).toEqual([]);
	});

	describe('with data', () => {
		beforeEach(() => {
			setupCkBTCStores();
		});

		it('should derive ic transactions', () => {
			const result = get(icTransactions);
			expect(result).toEqual([
				{
					data: mockCkBtcPendingUtxoTransaction,
					certified: false
				}
			]);
		});
	});
});
