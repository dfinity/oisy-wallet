import IconConvert from '$lib/components/icons/IconConvert.svelte';
import IconConvertFrom from '$lib/components/icons/IconConvertFrom.svelte';
import IconConvertTo from '$lib/components/icons/IconConvertTo.svelte';
import IconReceive from '$lib/components/icons/IconReceive.svelte';
import IconSend from '$lib/components/icons/IconSend.svelte';
import { MILLISECONDS_IN_SECOND, NANO_SECONDS_IN_SECOND } from '$lib/constants/app.constants';
import type { AnyTransactionUi, TransactionStatus, TransactionType } from '$lib/types/transaction';
import { formatSecondsToNormalizedDate } from '$lib/utils/format.utils';
import { isNullish } from '@dfinity/utils';
import type { ComponentType } from 'svelte';

export const mapTransactionIcon = ({
	type,
	status
}: {
	type: TransactionType;
	status: TransactionStatus;
}): ComponentType => {
	const isConversionFrom = type === 'withdraw' || type === 'mint';

	const isConversionTo = type === 'deposit' || type === 'burn' || type === 'approve';

	const isPendingConversion = (isConversionFrom || isConversionTo) && status === 'pending';

	return isPendingConversion
		? IconConvert
		: isConversionFrom
			? IconConvertFrom
			: isConversionTo
				? IconConvertTo
				: type === 'send'
					? IconSend
					: IconReceive;
};

/**
 * Group a list of transactions by date.
 *
 * It assumes that the transactions are already sorted by timestamp in descending order.
 * It does not sort the transactions, nor the groups.
 * If a transaction has no timestamp, it will be grouped under the key 'undefined'.
 *
 * @param transactions - List of transactions to group.
 * @returns Object where the keys are the date and the values are the transactions for that date.
 */
export const groupTransactionsByDate = <T extends AnyTransactionUi>(transactions: T[]) => {
	const currentDate = new Date();

	return transactions.reduce<Record<string, T[]>>((acc, transaction) => {
		if (isNullish(transaction.timestamp)) {
			return { ...acc, undefined: [...(acc['undefined'] ?? []), transaction] };
		}

		const timestamp = Number(transaction.timestamp);

		const date = formatSecondsToNormalizedDate({
			seconds:
				timestamp > 1e15
					? timestamp / Number(NANO_SECONDS_IN_SECOND)
					: timestamp > 1e12
						? timestamp / Number(MILLISECONDS_IN_SECOND)
						: timestamp,
			currentDate
		});

		return { ...acc, [date]: [...(acc[date] ?? []), transaction] };
	}, {});
};
