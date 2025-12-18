import { BTC_MAINNET_EXPLORER_URL } from '$env/explorers.env';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import { utxoTxIdToString } from '$icp/utils/btc.utils';
import type { CkBtcMinterDid } from '@icp-sdk/canisters/ckbtc';

export const mockPendingUtxo: CkBtcMinterDid.PendingUtxo = {
	value: 1000n,
	confirmations: 1,
	outpoint: { txid: Uint8Array.from([1, 2, 3]), vout: 666 }
};

export const mockCkBtcMinterInfo = { kyt_fee: 100n } as CkBtcMinterDid.MinterInfo;

export const mockCkBtcPendingUtxoTransaction: IcTransactionUi = {
	fromLabel: 'transaction.label.twin_network',
	id: `${utxoTxIdToString(mockPendingUtxo.outpoint.txid)}-${mockPendingUtxo.outpoint.vout}`,
	incoming: true,
	status: 'pending',
	txExplorerUrl: `${BTC_MAINNET_EXPLORER_URL}/tx/${utxoTxIdToString(mockPendingUtxo.outpoint.txid)}`,
	type: 'receive',
	typeLabel: 'transaction.label.converting_twin_token',
	value: mockPendingUtxo.value - mockCkBtcMinterInfo.kyt_fee
};
