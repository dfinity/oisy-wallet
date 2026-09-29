import { XRP_TOKEN, XRP_TOKEN_ID } from '$env/tokens/tokens.xrp.env';
import { ZERO } from '$lib/constants/app.constants';
import { token } from '$lib/stores/token.store';
import {
	xrpKnownDestinations,
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

	describe('xrpKnownDestinations', () => {
		const destination = 'rDestination';

		const createSend = ({
			id,
			value,
			timestamp
		}: {
			id: string;
			value: bigint;
			timestamp: bigint;
		}): { data: XrpTransactionUi; certified: boolean } => {
			const { data, certified } = createTransaction({ id, timestamp });

			return { data: { ...data, type: 'send', from: 'rOwn', to: destination, value }, certified };
		};

		it('returns an empty object when the store is empty', () => {
			expect(get(xrpKnownDestinations)).toEqual({});
		});

		it('groups the sends by destination, with the latest timestamp', () => {
			xrpTransactionsStore.append({
				tokenId: XRP_TOKEN_ID,
				transactions: [
					createSend({ id: 'tx3', value: 1_000_000n, timestamp: 1n }),
					createSend({ id: 'tx4', value: 2_000_000n, timestamp: 3n })
				]
			});

			expect(get(xrpKnownDestinations)).toEqual({
				[destination]: {
					address: destination,
					amounts: [
						{ value: 1_000_000n, token: XRP_TOKEN },
						{ value: 2_000_000n, token: XRP_TOKEN }
					],
					timestamp: 3
				}
			});
		});

		it('ignores receives and zero-amount sends', () => {
			xrpTransactionsStore.append({
				tokenId: XRP_TOKEN_ID,
				transactions: [...transactions, createSend({ id: 'tx3', value: ZERO, timestamp: 1n })]
			});

			expect(get(xrpKnownDestinations)).toEqual({});
		});
	});
});
