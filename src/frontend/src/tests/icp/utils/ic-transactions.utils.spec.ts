import { IC_CYCLES_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { btcStatusesStore } from '$icp/stores/btc.store';
import { ckBtcPendingUtxosStore } from '$icp/stores/ckbtc-utxos.store';
import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
import { icPendingTransactionsStore } from '$icp/stores/ic-pending-transactions.store';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import type { IcToken } from '$icp/types/ic-token';
import type { IcpTransaction } from '$icp/types/ic-transaction';
import { getCkBtcPendingUtxoTransactions } from '$icp/utils/ckbtc-transactions.utils';
import { getCkEthPendingTransactions } from '$icp/utils/cketh-transactions.utils';
import {
	getAllIcTransactions,
	getIcExtendedTransactions,
	mapIcTransaction
} from '$icp/utils/ic-transactions.utils';
import { ZERO } from '$lib/constants/app.constants';
import type { Token } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import {
	MOCK_CKBTC_TOKEN,
	MOCK_CKETH_TOKEN,
	cleanupCkBtcPendingStores,
	cleanupCkEthPendingStore,
	cleanupIcTransactionsStore,
	createMockIcrcBurnTransaction,
	createMockIcrcTransferTransaction,
	setupCkBtcPendingStores,
	setupCkEthPendingStore,
	setupIcTransactionsStore
} from '$tests/mocks/ic-transactions.mock';
import {
	mockAccountIdentifierText,
	mockIdentity,
	mockPrincipal,
	mockPrincipalText,
	mockPrincipalText2
} from '$tests/mocks/identity.mock';
import { nonNullish } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';
import { get } from 'svelte/store';

describe('getIcExtendedTransactions', () => {
	it('should return no transactions if the stores are empty', () => {
		const result = getIcExtendedTransactions({
			token: MOCK_CKETH_TOKEN as Token,
			icTransactionsStore: get(icTransactionsStore),
			btcStatusesStore: get(btcStatusesStore)
		});

		expect(result).toHaveLength(0);
	});

	it('should return 3 transactions', () => {
		setupIcTransactionsStore({
			tokenId: MOCK_CKETH_TOKEN.id ?? parseTokenId('')
		});

		const result = getIcExtendedTransactions({
			token: MOCK_CKETH_TOKEN as Token,
			icTransactionsStore: get(icTransactionsStore),
			btcStatusesStore: get(btcStatusesStore)
		});

		expect(result).toHaveLength(3);

		cleanupIcTransactionsStore({
			tokenId: MOCK_CKETH_TOKEN.id ?? parseTokenId('')
		});
	});
});

describe('getAllIcTransactions', () => {
	it('should return no transactions for a token if the stores are empty', () => {
		const ckEthToken = MOCK_CKETH_TOKEN as Token;

		const result = getAllIcTransactions({
			token: ckEthToken,
			ckBtcPendingUtxoTransactions: getCkBtcPendingUtxoTransactions({
				token: ckEthToken,
				ckBtcMinterInfoStore: get(ckBtcMinterInfoStore),
				ckBtcPendingUtxosStore: get(ckBtcPendingUtxosStore)
			}),
			ckEthPendingTransactions: getCkEthPendingTransactions({
				token: ckEthToken,
				icPendingTransactionsStore: get(icPendingTransactionsStore)
			}),
			icExtendedTransactions: getIcExtendedTransactions({
				token: ckEthToken,
				icTransactionsStore: get(icTransactionsStore),
				btcStatusesStore: get(btcStatusesStore)
			}),
			btcStatusesStore: get(btcStatusesStore),
			icTransactionsStore: get(icTransactionsStore),
			ckBtcPendingUtxosStore: get(ckBtcPendingUtxosStore),
			ckBtcMinterInfoStore: get(ckBtcMinterInfoStore),
			icPendingTransactionsStore: get(icPendingTransactionsStore)
		});

		expect(result).toHaveLength(0);
	});

	it('should return all transactions for a token', () => {
		const ckEthToken = MOCK_CKETH_TOKEN as Token;

		setupIcTransactionsStore({ tokenId: ckEthToken.id });
		setupCkBtcPendingStores();
		setupCkEthPendingStore();

		const result1 = getAllIcTransactions({
			token: ckEthToken,
			ckBtcPendingUtxoTransactions: getCkBtcPendingUtxoTransactions({
				token: ckEthToken,
				ckBtcMinterInfoStore: get(ckBtcMinterInfoStore),
				ckBtcPendingUtxosStore: get(ckBtcPendingUtxosStore)
			}),
			ckEthPendingTransactions: getCkEthPendingTransactions({
				token: ckEthToken,
				icPendingTransactionsStore: get(icPendingTransactionsStore)
			}),
			icExtendedTransactions: getIcExtendedTransactions({
				token: ckEthToken,
				icTransactionsStore: get(icTransactionsStore),
				btcStatusesStore: get(btcStatusesStore)
			}),
			btcStatusesStore: get(btcStatusesStore),
			icTransactionsStore: get(icTransactionsStore),
			ckBtcPendingUtxosStore: get(ckBtcPendingUtxosStore),
			ckBtcMinterInfoStore: get(ckBtcMinterInfoStore),
			icPendingTransactionsStore: get(icPendingTransactionsStore)
		});

		expect(result1).toHaveLength(5);

		const ckBtcToken = MOCK_CKBTC_TOKEN as Token;

		const result2 = getAllIcTransactions({
			token: ckBtcToken,
			ckBtcPendingUtxoTransactions: getCkBtcPendingUtxoTransactions({
				token: ckBtcToken,
				ckBtcMinterInfoStore: get(ckBtcMinterInfoStore),
				ckBtcPendingUtxosStore: get(ckBtcPendingUtxosStore)
			}),
			ckEthPendingTransactions: getCkEthPendingTransactions({
				token: ckBtcToken,
				icPendingTransactionsStore: get(icPendingTransactionsStore)
			}),
			icExtendedTransactions: getIcExtendedTransactions({
				token: ckBtcToken,
				icTransactionsStore: get(icTransactionsStore),
				btcStatusesStore: get(btcStatusesStore)
			}),
			btcStatusesStore: get(btcStatusesStore),
			icTransactionsStore: get(icTransactionsStore),
			ckBtcPendingUtxosStore: get(ckBtcPendingUtxosStore),
			ckBtcMinterInfoStore: get(ckBtcMinterInfoStore),
			icPendingTransactionsStore: get(icPendingTransactionsStore)
		});

		expect(result2).toHaveLength(1);

		cleanupIcTransactionsStore({ tokenId: ckEthToken.id });
		cleanupCkBtcPendingStores();
		cleanupCkEthPendingStore();
	});
});

describe('mapIcTransaction', () => {
	// `mockValidIcrcToken` carries the ckBTC ledger id, which would route to the ckBTC mapper.
	// Override it so the plain ICRC path is the one under test.
	const icrcToken: IcToken = { ...mockValidIcrcToken, ledgerCanisterId: mockPrincipalText2 };

	const icpTransfer = ({ spender }: { spender?: string } = {}): IcpTransaction => ({
		id: 123n,
		transaction: {
			memo: ZERO,
			icrc1_memo: [],
			operation: {
				Transfer: {
					to: 'abc',
					fee: { e8s: 456n },
					from: 'cde',
					amount: { e8s: 789n },
					spender: nonNullish(spender) ? [spender] : []
				}
			},
			timestamp: [],
			created_at_time: []
		}
	});

	describe('ICRC transfers', () => {
		it('should flag a transfer that an approved spender pulled', () => {
			const result = mapIcTransaction({
				transaction: createMockIcrcTransferTransaction({ spender: mockPrincipal }),
				token: icrcToken,
				identity: mockIdentity
			});

			expect(result.transferSpender).toBe(mockPrincipalText);
		});

		it('should not flag a transfer the account owner initiated', () => {
			const result = mapIcTransaction({
				transaction: createMockIcrcTransferTransaction(),
				token: icrcToken,
				identity: mockIdentity
			});

			expect(result.transferSpender).toBeUndefined();
		});
	});

	describe('cycles-ledger transactions', () => {
		const topUp = createMockIcrcBurnTransaction({
			memo: Uint8Array.from([
				0x81,
				0x4a,
				...Principal.fromText('ywcsb-maaaa-aaaai-q6k7a-cai').toUint8Array()
			])
		});

		it('should label a top-up on the cycles ledger', () => {
			const result = mapIcTransaction({
				transaction: topUp,
				token: { ...icrcToken, ledgerCanisterId: IC_CYCLES_LEDGER_CANISTER_ID },
				identity: mockIdentity
			});

			expect(result.typeLabel).toBe('transaction.label.top_up');
			expect(result.to).toBe('ywcsb-maaaa-aaaai-q6k7a-cai');
		});

		it('should not label the same burn on another ledger', () => {
			const result = mapIcTransaction({
				transaction: topUp,
				token: icrcToken,
				identity: mockIdentity
			});

			expect(result.typeLabel).toBeUndefined();
			expect(result.to).toBeUndefined();
		});
	});

	describe('ICP transfers', () => {
		it('should flag a transfer that an approved spender pulled', () => {
			const result = mapIcTransaction({
				transaction: icpTransfer({ spender: mockAccountIdentifierText }),
				token: ICP_TOKEN,
				identity: mockIdentity
			});

			expect(result.transferSpender).toBe(mockAccountIdentifierText);
		});

		it('should not flag a transfer the account owner initiated', () => {
			const result = mapIcTransaction({
				transaction: icpTransfer(),
				token: ICP_TOKEN,
				identity: mockIdentity
			});

			expect(result.transferSpender).toBeUndefined();
		});
	});
});
