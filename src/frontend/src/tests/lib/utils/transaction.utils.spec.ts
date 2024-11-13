import type { BtcTransactionUi } from '$btc/types/btc';
import type { EthTransactionUi } from '$eth/types/eth-transaction';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import IconConvert from '$lib/components/icons/IconConvert.svelte';
import IconConvertFrom from '$lib/components/icons/IconConvertFrom.svelte';
import IconConvertTo from '$lib/components/icons/IconConvertTo.svelte';
import IconReceive from '$lib/components/icons/IconReceive.svelte';
import IconSend from '$lib/components/icons/IconSend.svelte';
import { TransactionStatusSchema, TransactionTypeSchema } from '$lib/schema/transaction.schema';
import { groupTransactionsByDate, mapTransactionIcon } from '$lib/utils/transaction.utils';
import { createTransactionsUi } from '$tests/mocks/transactions.mock';

describe('transaction.utils', () => {
	describe('mapIcon', () => {
		const allNonPendingStatus = TransactionStatusSchema.options.filter(
			(status) => status !== 'pending'
		);

		const allConvertTypes = TransactionTypeSchema.options.filter(
			(type) => type !== 'send' && type !== 'receive'
		);

		allNonPendingStatus.forEach((status) => {
			it(`should return IconConvertFrom for withdraw and status ${status}`, () => {
				expect(mapTransactionIcon({ type: 'withdraw', status })).toBe(IconConvertFrom);
			});

			it(`should return IconConvertFrom for mint and status ${status}`, () => {
				expect(mapTransactionIcon({ type: 'mint', status })).toBe(IconConvertFrom);
			});

			it(`should return IconConvertTo for deposit and status ${status}`, () => {
				expect(mapTransactionIcon({ type: 'deposit', status })).toBe(IconConvertTo);
			});

			it(`should return IconConvertTo for burn and status ${status}`, () => {
				expect(mapTransactionIcon({ type: 'burn', status })).toBe(IconConvertTo);
			});

			it(`should return IconConvertTo for approve and status ${status}`, () => {
				expect(mapTransactionIcon({ type: 'approve', status })).toBe(IconConvertTo);
			});

			it(`should return IconSend for send and status ${status}`, () => {
				expect(mapTransactionIcon({ type: 'send', status })).toBe(IconSend);
			});

			it(`should return IconReceive for receive and status ${status}`, () => {
				expect(mapTransactionIcon({ type: 'receive', status })).toBe(IconReceive);
			});
		});

		it.each(allConvertTypes)('should return IconConvert for %s and status pending', (type) => {
			expect(mapTransactionIcon({ type, status: 'pending' })).toBe(IconConvert);
		});

		it(`should return IconSend for send and status pending`, () => {
			expect(mapTransactionIcon({ type: 'send', status: 'pending' })).toBe(IconSend);
		});

		it(`should return IconReceive for receive and status pending`, () => {
			expect(mapTransactionIcon({ type: 'receive', status: 'pending' })).toBe(IconReceive);
		});
	});

	describe('groupTransactionsByDate', () => {
		const baseTransactions: (BtcTransactionUi | EthTransactionUi | IcTransactionUi)[] =
			createTransactionsUi(5);

		const mockTransactions = baseTransactions.map((transaction, index) => ({
			...transaction,
			timestamp: index + 1
		})) as (BtcTransactionUi | EthTransactionUi | IcTransactionUi)[];

		beforeEach(() => {
			vi.clearAllMocks();

			vi.mock('$lib/utils/format.utils', () => ({
				formatSecondsToNormalizedDate: vi
					.fn()
					.mockImplementation(({ seconds, currentDate: _ }): string => seconds.toString())
			}));
		});

		it('should group transactions by formatted date when they are unique', () => {
			expect(groupTransactionsByDate(mockTransactions)).toEqual({
				'1': [mockTransactions[0]],
				'2': [mockTransactions[1]],
				'3': [mockTransactions[2]],
				'4': [mockTransactions[3]],
				'5': [mockTransactions[4]]
			});
		});

		it('should group transactions by formatted date when they are not unique', () => {
			const transactions = [
				{ ...mockTransactions[0], timestamp: 1 },
				{ ...mockTransactions[1], timestamp: 1 },
				{ ...mockTransactions[2], timestamp: 1 },
				{ ...mockTransactions[3], timestamp: 2 },
				{ ...mockTransactions[4], timestamp: 2 }
			] as (BtcTransactionUi | EthTransactionUi | IcTransactionUi)[];

			expect(groupTransactionsByDate(transactions)).toEqual({
				'1': transactions.slice(0, 3),
				'2': transactions.slice(3)
			});
		});

		it('should handle transactions without timestamps', () => {
			const transactions = [mockTransactions[0], { ...mockTransactions[1], timestamp: undefined }];

			expect(groupTransactionsByDate(transactions)).toEqual({
				'1': [transactions[0]],
				undefined: [transactions[1]]
			});
		});

		it('should return an empty object for empty transactions array', () => {
			expect(groupTransactionsByDate([])).toEqual({});
		});
	});
});
