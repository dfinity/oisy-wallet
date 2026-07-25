import { XRP_TOKEN, XRP_TOKEN_ID } from '$env/tokens/tokens.xrp.env';
import { token } from '$lib/stores/token.store';
import {
	xrpTransactions,
	xrpTransactionsInitialized,
	xrpTransactionsNotInitialized
} from '$xrp/derived/xrp-transactions.derived';
import { xrpTransactionsStore } from '$xrp/stores/xrp-transactions.store';
import type { XrpTransactionUi } from '$xrp/types/xrp-transaction';
import { get } from 'svelte/store';

describe('xrp-transactions.derived', () => {
	const createTransaction = ({
		id,
		timestamp
	}: {
		id: string;
		timestamp: bigint;
	}): { data: XrpTransactionUi; certified: boolean } => ({
		data: {
			id,
			type: 'receive',
			status: 'confirmed',
			value: 5_000_000n,
			from: 'rSender',
			to: 'rReceiver',
			timestamp
		},
		certified: false
	});

	const transactions = [
		createTransaction({ id: 'tx1', timestamp: 2n }),
		createTransaction({ id: 'tx2', timestamp: 1n })
	];

	beforeEach(() => {
		token.set(XRP_TOKEN);
		xrpTransactionsStore.reset(XRP_TOKEN_ID);
	});

	describe('xrpTransactions', () => {
		it('returns an empty array when the store is empty', () => {
			expect(get(xrpTransactions)).toEqual([]);
		});

		it('returns the transactions for the current token, newest first', () => {
			xrpTransactionsStore.append({ tokenId: XRP_TOKEN_ID, transactions });

			const result = get(xrpTransactions);

			expect(result).toHaveLength(2);
			expect(result[0].id).toBe('tx1');
			expect(result[1].id).toBe('tx2');
		});
	});

	describe('xrpTransactionsInitialized', () => {
		it('is false before any load and true once the store has data', () => {
			expect(get(xrpTransactionsInitialized)).toBeFalsy();
			expect(get(xrpTransactionsNotInitialized)).toBeTruthy();

			xrpTransactionsStore.append({ tokenId: XRP_TOKEN_ID, transactions });

			expect(get(xrpTransactionsInitialized)).toBeTruthy();
			expect(get(xrpTransactionsNotInitialized)).toBeFalsy();
		});
	});
});
