import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ckBtcPendingUtxoTransactions } from '$icp/derived/ckbtc-transactions.derived';
import { token } from '$lib/stores/token.store';
import { mockCkBtcPendingUtxoTransaction } from '$tests/mocks/ckbtc.mock';
import { setupCkBTCStores } from '$tests/utils/ckbtc-stores.test-utils';
import { get } from 'svelte/store';

describe('ckBtcPendingUtxoTransactions', () => {
	it('returns empty array for non-ckBTC token', () => {
		token.set(ETHEREUM_TOKEN);

		const result = get(ckBtcPendingUtxoTransactions);

		expect(result).toEqual([]);
	});

	describe('with data', () => {
		beforeEach(setupCkBTCStores);

		it('should derive pending UTXOs correctly', () => {
			const result = get(ckBtcPendingUtxoTransactions);

			expect(result).toHaveLength(1);
			expect(result[0].data).toEqual(mockCkBtcPendingUtxoTransaction);
		});

		it('derived pending UTXOs is always not certified', () => {
			const result = get(ckBtcPendingUtxoTransactions);

			expect(result[0].certified).toBeFalsy();
		});
	});
});
