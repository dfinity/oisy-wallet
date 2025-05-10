import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import IconConvert from '$lib/components/icons/IconConvert.svelte';
import IconConvertFrom from '$lib/components/icons/IconConvertFrom.svelte';
import IconConvertTo from '$lib/components/icons/IconConvertTo.svelte';
import IconReceive from '$lib/components/icons/IconReceive.svelte';
import IconSend from '$lib/components/icons/IconSend.svelte';
import { MILLISECONDS_IN_SECOND, NANO_SECONDS_IN_MILLISECOND } from '$lib/constants/app.constants';
import { TransactionStatusSchema, TransactionTypeSchema } from '$lib/schema/transaction.schema';
import { i18n } from '$lib/stores/i18n.store';
import type { ModalData } from '$lib/stores/modal.store';
import type { AnyTransactionUiWithCmp } from '$lib/types/transaction';
import {
	groupTransactionsByDate,
	mapTransactionIcon,
	mapTransactionModalData
} from '$lib/utils/transaction.utils';
import en from '$tests/mocks/i18n.mock';
import { createMockIcTransactionsUi } from '$tests/mocks/ic-transactions.mock';
import { createTransactionsUiWithCmp } from '$tests/mocks/transactions.mock';
import { get } from 'svelte/store';

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
		const baseTransactions = createTransactionsUiWithCmp(5);

		const mockTransactions = baseTransactions.map(({ transaction, ...rest }, index) => ({
			transaction: {
				...transaction,
				timestamp: index + 1
			},
			...rest
		})) as AnyTransactionUiWithCmp[];

		const nowInMilliseconds =
			Math.floor(Date.now() / MILLISECONDS_IN_SECOND) * MILLISECONDS_IN_SECOND;
		const nowInSeconds = nowInMilliseconds / MILLISECONDS_IN_SECOND;
		const nowInNanoSeconds = nowInMilliseconds * Number(NANO_SECONDS_IN_MILLISECOND);

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
				{
					transaction: { ...mockTransactions[0].transaction, timestamp: 1 },
					component: mockTransactions[0].component
				},
				{
					transaction: { ...mockTransactions[1].transaction, timestamp: 1 },
					component: mockTransactions[1].component
				},
				{
					transaction: { ...mockTransactions[2].transaction, timestamp: 1 },
					component: mockTransactions[2].component
				},
				{
					transaction: { ...mockTransactions[3].transaction, timestamp: 2 },
					component: mockTransactions[3].component
				},
				{
					transaction: { ...mockTransactions[4].transaction, timestamp: 2 },
					component: mockTransactions[4].component
				}
			] as AnyTransactionUiWithCmp[];

			expect(groupTransactionsByDate(transactions)).toEqual({
				'1': transactions.slice(0, 3),
				'2': transactions.slice(3)
			});
		});

		it('should handle transactions without timestamps', () => {
			const undefinedKey = en.transaction.label.no_date_available;
			const transactions = [
				mockTransactions[0],
				{
					transaction: { ...mockTransactions[1], timestamp: undefined },
					component: mockTransactions[1].component
				}
			] as AnyTransactionUiWithCmp[];

			expect(groupTransactionsByDate(transactions)).toEqual({
				'1': [transactions[0]],
				[undefinedKey]: [transactions[1]]
			});
		});

		it('should return an empty object for empty transactions array', () => {
			expect(groupTransactionsByDate([])).toEqual({});
		});

		it('should handle timestamps provided in nanoseconds', () => {
			const transactions = [
				mockTransactions[0],
				{
					transaction: { ...mockTransactions[1].transaction, timestamp: nowInNanoSeconds },
					component: mockTransactions[1].component
				}
			] as AnyTransactionUiWithCmp[];

			expect(groupTransactionsByDate(transactions)).toEqual({
				[1]: [transactions[0]],
				[nowInSeconds.toString()]: [transactions[1]]
			});
		});

		it('should handle timestamps provided in milliseconds', () => {
			const transactions = [
				mockTransactions[0],
				{
					transaction: { ...mockTransactions[1].transaction, timestamp: nowInMilliseconds },
					component: mockTransactions[1].component
				}
			] as AnyTransactionUiWithCmp[];

			expect(groupTransactionsByDate(transactions)).toEqual({
				'1': [transactions[0]],
				[nowInSeconds.toString()]: [transactions[1]]
			});
		});

		it('should place pending transactions in its own category and on top', () => {
			const expectedPendingTransactions = [
				{
					component: mockTransactions[0].component,
					transaction: { ...mockTransactions[0].transaction, status: 'pending', timestamp: null }
				},
				{
					component: mockTransactions[1].component,
					transaction: { ...mockTransactions[1].transaction, status: 'pending', timestamp: null }
				}
			];
			const transactions = [
				...mockTransactions.map((t) => ({
					...t,
					transaction: { ...t.transaction, timestamp: new Date().getTime() }
				})),
				expectedPendingTransactions[0],
				expectedPendingTransactions[1]
			] as AnyTransactionUiWithCmp[];

			const groupedList = groupTransactionsByDate(transactions);

			expect(groupedList[get(i18n).transaction.label.pending]).toEqual(expectedPendingTransactions);

			expect(Object.keys(groupedList).indexOf(get(i18n).transaction.label.pending)).toEqual(0);
		});
	});

	describe('mapTransactionModalData', () => {
		const type = 'ic-transaction';

		const mockToken = ICP_TOKEN;
		const [mockIcTransactionUi] = createMockIcTransactionsUi(1);

		const mockModalStore = {
			type,
			data: { transaction: mockIcTransactionUi, token: mockToken }
		} as ModalData<unknown>;

		it('should return transaction and token if modal is open and store data is valid', () => {
			const $modalOpen = true;

			const result = mapTransactionModalData<IcTransactionUi>({
				$modalOpen,
				$modalStore: mockModalStore
			});

			expect(result.transaction).toEqual(mockIcTransactionUi);
			expect(result.token).toEqual(mockToken);
		});

		it('should return undefined transaction and token if modal is closed', () => {
			const $modalOpen = false;

			const result = mapTransactionModalData<IcTransactionUi>({
				$modalOpen,
				$modalStore: mockModalStore
			});

			expect(result.transaction).toBeUndefined();
			expect(result.token).toBeUndefined();
		});

		it('should return undefined transaction and token if store data is null', () => {
			const $modalOpen = true;
			const $modalStore = { type, data: null } as ModalData<unknown>;

			const result = mapTransactionModalData<IcTransactionUi>({
				$modalOpen,
				$modalStore
			});

			expect(result.transaction).toBeUndefined();
			expect(result.token).toBeUndefined();
		});

		it('should return undefined transaction and token if store data is missing', () => {
			const $modalOpen = true;
			const $modalStore = {} as ModalData<unknown>;

			const result = mapTransactionModalData<IcTransactionUi>({
				$modalOpen,
				$modalStore
			});

			expect(result.transaction).toBeUndefined();
			expect(result.token).toBeUndefined();
		});
	});
});
