import IconConvert from '$lib/components/icons/IconConvert.svelte';
import IconConvertFrom from '$lib/components/icons/IconConvertFrom.svelte';
import IconConvertTo from '$lib/components/icons/IconConvertTo.svelte';
import IconReceive from '$lib/components/icons/IconReceive.svelte';
import IconSend from '$lib/components/icons/IconSend.svelte';
import { TransactionStatusSchema, TransactionTypeSchema } from '$lib/schema/transaction.schema';
import { mapIcon } from '$lib/utils/transaction.utils';

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
				expect(mapIcon({ type: 'withdraw', status })).toBe(IconConvertFrom);
			});

			it(`should return IconConvertFrom for mint and status ${status}`, () => {
				expect(mapIcon({ type: 'mint', status })).toBe(IconConvertFrom);
			});

			it(`should return IconConvertTo for deposit and status ${status}`, () => {
				expect(mapIcon({ type: 'deposit', status })).toBe(IconConvertTo);
			});

			it(`should return IconConvertTo for burn and status ${status}`, () => {
				expect(mapIcon({ type: 'burn', status })).toBe(IconConvertTo);
			});

			it(`should return IconConvertTo for approve and status ${status}`, () => {
				expect(mapIcon({ type: 'approve', status })).toBe(IconConvertTo);
			});

			it(`should return IconSend for send and status ${status}`, () => {
				expect(mapIcon({ type: 'send', status })).toBe(IconSend);
			});

			it(`should return IconReceive for receive and status ${status}`, () => {
				expect(mapIcon({ type: 'receive', status })).toBe(IconReceive);
			});
		});

		allConvertTypes.forEach((type) => {
			it(`should return IconConvert for ${type} and status pending`, () => {
				expect(mapIcon({ type, status: 'pending' })).toBe(IconConvert);
			});
		});

		it(`should return IconSend for send and status pending`, () => {
			expect(mapIcon({ type: 'send', status: 'pending' })).toBe(IconSend);
		});

		it(`should return IconReceive for receive and status pending`, () => {
			expect(mapIcon({ type: 'receive', status: 'pending' })).toBe(IconReceive);
		});
	});
});
