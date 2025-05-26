import { CKETH_EXPLORER_URL, CKETH_SEPOLIA_EXPLORER_URL } from '$env/explorers.env';
import {
	IC_CKETH_LEDGER_CANISTER_ID,
	STAGING_CKETH_LEDGER_CANISTER_ID
} from '$env/networks/networks.icrc.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { icPendingTransactionsStore } from '$icp/stores/ic-pending-transactions.store';
import type { IcrcTransaction } from '$icp/types/ic-transaction';
import {
	getCkEthPendingTransactions,
	mapCkEthereumTransaction
} from '$icp/utils/cketh-transactions.utils';
import type { Token } from '$lib/types/token';
import {
	MOCK_CKETH_TOKEN,
	cleanupCkEthPendingStore,
	setupCkEthPendingStore
} from '$tests/mocks/ic-transactions.mock';
import { Principal } from '@dfinity/principal';
import { assertNonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

describe('mapCkEthereumTransaction', () => {
	const mockTransaction: IcrcTransaction = {
		id: 123456n,
		transaction: {
			kind: 'send',
			burn: [],
			mint: [],
			approve: [],
			transfer: [
				{
					amount: 100000000n,
					fee: [10000n],
					created_at_time: [1730723519954194000n],
					from: {
						owner: Principal.fromText(
							'e4cfm-h7z2r-dwrg2-bjuni-h2bxf-73kfn-kf3lo-cxfz4-fnknl-ii2co-qqe'
						),
						subaccount: []
					},
					to: {
						owner: Principal.fromText(
							'l4uhj-2gtsy-jypxp-yw4vy-mhxtp-xbnj3-tp7nv-f2bba-fesfa-jslac-bae'
						),
						subaccount: []
					},
					memo: [],
					spender: []
				}
			],
			timestamp: BigInt('1730723519954194000')
		}
	};

	it('should return correct explorer URLs for ckETH environment', () => {
		const result = mapCkEthereumTransaction({
			transaction: mockTransaction,
			identity: undefined,
			ledgerCanisterId: IC_CKETH_LEDGER_CANISTER_ID,
			env: 'mainnet'
		});

		expect(result.txExplorerUrl).toMatch(new RegExp(`^${CKETH_EXPLORER_URL}`));
	});

	it('should return correct explorer URLs for ckSepoliaETH', () => {
		assertNonNullish(STAGING_CKETH_LEDGER_CANISTER_ID);

		const result = mapCkEthereumTransaction({
			transaction: mockTransaction,
			identity: undefined,
			ledgerCanisterId: STAGING_CKETH_LEDGER_CANISTER_ID.toString(),
			env: 'mainnet'
		});

		expect(result.txExplorerUrl).toMatch(new RegExp(`^${CKETH_SEPOLIA_EXPLORER_URL}`));
	});
});

describe('getCkEthPendingTransactions', () => {
	it('should return empty array when no pending transactions', () => {
		const result = getCkEthPendingTransactions({
			token: MOCK_CKETH_TOKEN as Token,
			icPendingTransactionsStore: get(icPendingTransactionsStore)
		});

		expect(result).toHaveLength(0);
	});

	it('should return the pending transactions', () => {
		setupCkEthPendingStore();

		const result = getCkEthPendingTransactions({
			token: MOCK_CKETH_TOKEN as Token,
			icPendingTransactionsStore: get(icPendingTransactionsStore)
		});

		expect(result).toHaveLength(2);

		cleanupCkEthPendingStore();
	});

	it('should not return the pending transactions for wrong token', () => {
		setupCkEthPendingStore();

		const result = getCkEthPendingTransactions({
			token: ICP_TOKEN,
			icPendingTransactionsStore: get(icPendingTransactionsStore)
		});

		expect(result).toHaveLength(0);

		cleanupCkEthPendingStore();
	});
});
