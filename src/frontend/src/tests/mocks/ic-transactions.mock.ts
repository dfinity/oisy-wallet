import {
	IC_CKBTC_LEDGER_CANISTER_ID,
	IC_CKETH_LEDGER_CANISTER_ID
} from '$env/networks/networks.icrc.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { ckBtcPendingUtxosStore } from '$icp/stores/ckbtc-utxos.store';
import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
import { icPendingTransactionsStore } from '$icp/stores/ic-pending-transactions.store';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import type { IcCkToken } from '$icp/types/ic-token';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import type { Token, TokenId } from '$lib/types/token';
import { bn1Bi } from '$tests/mocks/balances.mock';
import { mockCkBtcMinterInfo, mockCkBtcPendingUtxoTransaction } from '$tests/mocks/ckbtc.mock';
import { createCertifiedIcTransactionUiMock } from '$tests/utils/transactions-stores.test-utils';
import type { PendingUtxo } from '@dfinity/ckbtc';

export const createMockIcTransactionsUi = (n: number): IcTransactionUi[] =>
	Array.from({ length: n }, () => ({
		id: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(),
		type: 'send',
		status: 'executed',
		value: bn1Bi,
		from: 'dndtm-gk4kn-ssvos-asuit-2q33x-lgtpj-5bnoi-v5ync-m4iza-xclem-mae',
		to: 'cmpd6-ywgum-ofyfa-masyv-v3gba-il2hu-upwxw-xhdq3-mzkhx-zfhpb-7ae',
		timestamp: 1_747_732_396_194_882_329n
	}));

export const setupIcTransactionsStore = ({ tokenId }: { tokenId: TokenId }) => {
	const transactions = [
		createCertifiedIcTransactionUiMock('tx1'),
		createCertifiedIcTransactionUiMock('tx2'),
		createCertifiedIcTransactionUiMock('tx3')
	];

	icTransactionsStore.append({
		tokenId,
		transactions
	});
};

export const cleanupIcTransactionsStore = ({ tokenId }: { tokenId: TokenId }) => {
	icTransactionsStore.reset(tokenId);
};

export const MOCK_CKBTC_TOKEN: Partial<IcCkToken> = {
	...BTC_MAINNET_TOKEN,
	ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID
};

export const setupCkBtcPendingStores = () => {
	ckBtcPendingUtxosStore.set({
		id: (MOCK_CKBTC_TOKEN as Token).id,
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
		id: (MOCK_CKBTC_TOKEN as Token).id,
		data: {
			data: mockCkBtcMinterInfo,
			certified: true
		}
	});
};

export const cleanupCkBtcPendingStores = () => {
	ckBtcPendingUtxosStore.reset(ICP_TOKEN.id);
	ckBtcPendingUtxosStore.reset((MOCK_CKBTC_TOKEN as Token).id);
	ckBtcMinterInfoStore.reset((MOCK_CKBTC_TOKEN as Token).id);
};

export const MOCK_CKETH_TOKEN: Partial<IcCkToken> = {
	...ETHEREUM_TOKEN,
	ledgerCanisterId: IC_CKETH_LEDGER_CANISTER_ID
};

export const setupCkEthPendingStore = () => {
	const transactions = [
		createCertifiedIcTransactionUiMock('tx1'),
		createCertifiedIcTransactionUiMock('tx2')
	];

	icPendingTransactionsStore.set({
		tokenId: (MOCK_CKETH_TOKEN as Token).id,
		data: transactions
	});
};

export const cleanupCkEthPendingStore = () => {
	icPendingTransactionsStore.reset(ICP_TOKEN.id);
	icPendingTransactionsStore.reset((MOCK_CKETH_TOKEN as Token).id);
};
