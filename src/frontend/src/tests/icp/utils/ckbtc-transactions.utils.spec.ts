import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { ckBtcPendingUtxosStore } from '$icp/stores/ckbtc-utxos.store';
import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
import { getCkBtcPendingUtxoTransactions } from '$icp/utils/ckbtc-transactions.utils';
import type { Token } from '$lib/types/token';
import {
	MOCK_CKBTC_TOKEN,
	cleanupCkBtcPendingStores,
	setupCkBtcPendingStores
} from '$tests/mocks/ic-transactions.mock';
import { get } from 'svelte/store';

describe('ckBtcPendingUtxoTransactions', () => {
	it('should return empty array when no pending transactions', () => {
		const result = getCkBtcPendingUtxoTransactions({
			token: MOCK_CKBTC_TOKEN as Token,
			ckBtcMinterInfoStore: get(ckBtcMinterInfoStore),
			ckBtcPendingUtxosStore: get(ckBtcPendingUtxosStore)
		});

		expect(result).toHaveLength(0);
	});

	it('should return the pending transactions', () => {
		setupCkBtcPendingStores();

		const result = getCkBtcPendingUtxoTransactions({
			token: MOCK_CKBTC_TOKEN as Token,
			ckBtcMinterInfoStore: get(ckBtcMinterInfoStore),
			ckBtcPendingUtxosStore: get(ckBtcPendingUtxosStore)
		});

		expect(result).toHaveLength(1);

		cleanupCkBtcPendingStores();
	});

	it('should not return the pending transactions for wrong token', () => {
		setupCkBtcPendingStores();

		const result = getCkBtcPendingUtxoTransactions({
			token: ICP_TOKEN,
			ckBtcMinterInfoStore: get(ckBtcMinterInfoStore),
			ckBtcPendingUtxosStore: get(ckBtcPendingUtxosStore)
		});

		expect(result).toHaveLength(0);

		cleanupCkBtcPendingStores();
	});
});
