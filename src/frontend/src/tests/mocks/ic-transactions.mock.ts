import { IC_CKBTC_LEDGER_CANISTER_ID } from '$env/tokens/tokens-icrc/tokens.icrc.ck.btc.env';
import { IC_CKETH_LEDGER_CANISTER_ID } from '$env/tokens/tokens-icrc/tokens.icrc.ck.eth.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { ckBtcPendingUtxosStore } from '$icp/stores/ckbtc-utxos.store';
import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
import { icPendingTransactionsStore } from '$icp/stores/ic-pending-transactions.store';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import type { IcCkToken } from '$icp/types/ic-token';
import type { IcTransactionUi, IcrcTransaction } from '$icp/types/ic-transaction';
import type { TokenId } from '$lib/types/token';
import { bn1Bi, bn3Bi } from '$tests/mocks/balances.mock';
import { mockCkBtcMinterInfo, mockPendingUtxo } from '$tests/mocks/ckbtc.mock';
import { mockPrincipal, mockPrincipal2 } from '$tests/mocks/identity.mock';
import { createCertifiedIcTransactionUiMock } from '$tests/utils/transactions-stores.test-utils';
import { toNullable } from '@dfinity/utils';

const mockTimestamp = 1_700_000_000_000_000_000n;

export const createMockIcrcTransferTransaction = ({
	id = 100n,
	amount = 50_000n,
	memo
}: { id?: bigint; amount?: bigint; memo?: Uint8Array } = {}): IcrcTransaction => ({
	id,
	transaction: {
		kind: 'transfer',
		burn: [],
		mint: [],
		approve: [],
		transfer: [
			{
				amount,
				fee: toNullable(100n),
				created_at_time: toNullable(mockTimestamp),
				from: { owner: mockPrincipal, subaccount: [] },
				to: { owner: mockPrincipal2, subaccount: [] },
				memo: memo ? [memo] : [],
				spender: []
			}
		],
		fee_collector: [],
		timestamp: mockTimestamp
	}
});

export const createMockIcrcMintTransaction = ({
	id = 200n,
	amount = 100_000n,
	memo
}: { id?: bigint; amount?: bigint; memo?: Uint8Array } = {}): IcrcTransaction => ({
	id,
	transaction: {
		kind: 'mint',
		burn: [],
		mint: [
			{
				amount,
				fee: [],
				created_at_time: toNullable(mockTimestamp),
				to: { owner: mockPrincipal, subaccount: [] },
				memo: memo ? [memo] : []
			}
		],
		approve: [],
		transfer: [],
		fee_collector: [],
		timestamp: mockTimestamp
	}
});

export const createMockIcrcBurnTransaction = ({
	id = 300n,
	amount = 75_000n,
	memo
}: { id?: bigint; amount?: bigint; memo?: Uint8Array } = {}): IcrcTransaction => ({
	id,
	transaction: {
		kind: 'burn',
		burn: [
			{
				amount,
				fee: [],
				created_at_time: toNullable(mockTimestamp),
				from: { owner: mockPrincipal, subaccount: [] },
				memo: memo ? [memo] : [],
				spender: []
			}
		],
		mint: [],
		approve: [],
		transfer: [],
		fee_collector: [],
		timestamp: mockTimestamp
	}
});

export const createMockIcTransactionsUi = (n: number): IcTransactionUi[] =>
	Array.from({ length: n }, () => ({
		id: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(),
		type: 'send',
		status: 'executed',
		value: bn3Bi,
		fee: bn1Bi,
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

export const MOCK_CKBTC_TOKEN: IcCkToken = {
	...BTC_MAINNET_TOKEN,
	fee: 10n,
	ledgerCanisterId: IC_CKBTC_LEDGER_CANISTER_ID
};

export const setupCkBtcPendingStores = () => {
	ckBtcPendingUtxosStore.set({
		id: MOCK_CKBTC_TOKEN.id,
		data: {
			data: [mockPendingUtxo],
			certified: true
		}
	});
	ckBtcMinterInfoStore.set({
		id: MOCK_CKBTC_TOKEN.id,
		data: {
			data: mockCkBtcMinterInfo,
			certified: true
		}
	});
};

export const cleanupCkBtcPendingStores = () => {
	ckBtcPendingUtxosStore.reset(ICP_TOKEN.id);
	ckBtcPendingUtxosStore.reset(MOCK_CKBTC_TOKEN.id);
	ckBtcMinterInfoStore.reset(MOCK_CKBTC_TOKEN.id);
};

export const MOCK_CKETH_TOKEN: IcCkToken = {
	...ETHEREUM_TOKEN,
	fee: 2_000_000_000_000n,
	ledgerCanisterId: IC_CKETH_LEDGER_CANISTER_ID
};

export const setupCkEthPendingStore = () => {
	const transactions = [
		createCertifiedIcTransactionUiMock('tx1'),
		createCertifiedIcTransactionUiMock('tx2')
	];

	icPendingTransactionsStore.set({
		tokenId: MOCK_CKETH_TOKEN.id,
		data: transactions
	});
};

export const cleanupCkEthPendingStore = () => {
	icPendingTransactionsStore.reset(ICP_TOKEN.id);
	icPendingTransactionsStore.reset(MOCK_CKETH_TOKEN.id);
};
