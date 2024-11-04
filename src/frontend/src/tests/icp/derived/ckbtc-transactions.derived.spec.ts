import { BTC_MAINNET_EXPLORER_URL } from '$env/explorers.env';
import {
	IC_CKBTC_INDEX_CANISTER_ID,
	IC_CKBTC_LEDGER_CANISTER_ID,
	IC_CKBTC_MINTER_CANISTER_ID
} from '$env/networks.icrc.env';
import { ETHEREUM_TOKEN } from '$env/tokens.env';
import { ckBtcPendingUtxoTransactions } from '$icp/derived/ckbtc-transactions.derived';
import { ckBtcPendingUtxosStore } from '$icp/stores/ckbtc-utxos.store';
import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
import type { IcCkToken } from '$icp/types/ic';
import { utxoTxIdToString } from '$icp/utils/btc.utils';
import { token } from '$lib/stores/token.store';
import type { TokenId } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import type { MinterInfo, PendingUtxo } from '@dfinity/ckbtc';
import { get } from 'svelte/store';

describe('ckBtcPendingUtxoTransactions', () => {
	it('returns empty array for non-ckBTC token', () => {
		token.set(ETHEREUM_TOKEN);

		const result = get(ckBtcPendingUtxoTransactions);
		expect(result).toEqual([]);
	});

	describe('with data', () => {
		const mockUtxo: PendingUtxo = {
			value: 1000n,
			confirmations: 1,
			outpoint: { txid: [1, 2, 3], vout: 666 }
		};

		const minterInfo = { kyt_fee: 100n } as MinterInfo;

		beforeEach(() => {
			const tokenId: TokenId = parseTokenId('test');

			const mockToken: IcCkToken = {
				id: tokenId,
				standard: 'icrc',
				ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID,
				indexCanisterId: IC_CKBTC_INDEX_CANISTER_ID,
				minterCanisterId: IC_CKBTC_MINTER_CANISTER_ID
			} as unknown as IcCkToken;

			token.set(mockToken);

			ckBtcMinterInfoStore.set({
				tokenId,
				data: {
					data: minterInfo,
					certified: true
				}
			});

			ckBtcPendingUtxosStore.set({
				tokenId,
				data: {
					data: [mockUtxo],
					certified: true
				}
			});
		});

		it('should derive pending UTXOs correctly', () => {
			const result = get(ckBtcPendingUtxoTransactions);

			expect(result).toHaveLength(1);
			expect(result[0].data).toEqual({
				fromLabel: 'transaction.label.twin_network',
				id: `${utxoTxIdToString(mockUtxo.outpoint.txid)}-${mockUtxo.outpoint.vout}`,
				incoming: true,
				status: 'pending',
				txExplorerUrl: `${BTC_MAINNET_EXPLORER_URL}/tx/${utxoTxIdToString(mockUtxo.outpoint.txid)}`,
				type: 'receive',
				typeLabel: 'transaction.label.receiving_twin_token',
				value: mockUtxo.value - minterInfo.kyt_fee
			});
		});

		it('derived pending UTXOs is always not certified', () => {
			const result = get(ckBtcPendingUtxoTransactions);
			expect(result[0].certified).toBe(false);
		});
	});
});
