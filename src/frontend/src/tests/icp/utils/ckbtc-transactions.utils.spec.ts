import { IC_CKBTC_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { ckBtcPendingUtxosStore } from '$icp/stores/ckbtc-utxos.store';
import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
import type { IcCkToken } from '$icp/types/ic-token';
import { getCkBtcPendingUtxoTransactions } from '$icp/utils/ckbtc-transactions.utils';
import type { Token } from '$lib/types/token';
import { mockCkBtcMinterInfo, mockCkBtcPendingUtxoTransaction } from '$tests/mocks/ckbtc.mock';
import type { PendingUtxo } from '@dfinity/ckbtc';
import { get } from 'svelte/store';

describe('ckBtcPendingUtxoTransactions', () => {
	const MOCK_CKBTC_TOKEN: Partial<IcCkToken> = {
		...BTC_MAINNET_TOKEN,
		ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID
	};

	const setupStore = () => {
		ckBtcPendingUtxosStore.set({
			tokenId: (MOCK_CKBTC_TOKEN as Token).id,
			data: {
				data: [
					{
						...mockCkBtcPendingUtxoTransaction,
						outpoint: { txid: [0], vout: '' }
					} as unknown as PendingUtxo
				],
				certified: true
			}
		});
		ckBtcMinterInfoStore.set({
			tokenId: (MOCK_CKBTC_TOKEN as Token).id,
			data: {
				data: mockCkBtcMinterInfo,
				certified: true
			}
		});
	};

	const cleanupStore = () => {
		ckBtcPendingUtxosStore.reset(ICP_TOKEN.id);
		ckBtcPendingUtxosStore.reset((MOCK_CKBTC_TOKEN as Token).id);
		ckBtcMinterInfoStore.reset((MOCK_CKBTC_TOKEN as Token).id);
	};

	it('should return empty array when no pending transactions', () => {
		const result = getCkBtcPendingUtxoTransactions({
			token: MOCK_CKBTC_TOKEN as Token,
			ckBtcMinterInfoStore: get(ckBtcMinterInfoStore),
			ckBtcPendingUtxosStore: get(ckBtcPendingUtxosStore)
		});

		expect(result.length).toEqual(0);
	});

	it('should return the pending transactions', () => {
		setupStore();

		const result = getCkBtcPendingUtxoTransactions({
			token: MOCK_CKBTC_TOKEN as Token,
			ckBtcMinterInfoStore: get(ckBtcMinterInfoStore),
			ckBtcPendingUtxosStore: get(ckBtcPendingUtxosStore)
		});

		expect(result.length).toEqual(1);

		cleanupStore();
	});

	it('should not return the pending transactions for wrong token', () => {
		setupStore();

		const result = getCkBtcPendingUtxoTransactions({
			token: ICP_TOKEN,
			ckBtcMinterInfoStore: get(ckBtcMinterInfoStore),
			ckBtcPendingUtxosStore: get(ckBtcPendingUtxosStore)
		});

		expect(result.length).toEqual(0);

		cleanupStore();
	});
});
