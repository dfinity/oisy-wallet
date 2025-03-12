import { normalizeTimestampToSeconds } from '$icp/utils/date.utils';
import IconConvert from '$lib/components/icons/IconConvert.svelte';
import IconConvertFrom from '$lib/components/icons/IconConvertFrom.svelte';
import IconConvertTo from '$lib/components/icons/IconConvertTo.svelte';
import IconReceive from '$lib/components/icons/IconReceive.svelte';
import IconSend from '$lib/components/icons/IconSend.svelte';
import { i18n } from '$lib/stores/i18n.store';
import type { ModalData } from '$lib/stores/modal.store';
import type { OptionToken } from '$lib/types/token';
import type {
	AnyTransactionUi,
	AnyTransactionUiWithCmp,
	TransactionStatus,
	TransactionsUiDateGroup,
	TransactionType
} from '$lib/types/transaction';
import { formatSecondsToNormalizedDate } from '$lib/utils/format.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { ComponentType } from 'svelte';
import { get } from 'svelte/store';

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
export const groupTransactionsByDate = <T extends AnyTransactionUiWithCmp>(
	transactions: T[]
): TransactionsUiDateGroup<T> => {
	const currentDate = new Date();
	const undefinedKey = get(i18n).transaction.label.no_date_available;

	return transactions.reduce<TransactionsUiDateGroup<T>>((acc, transaction) => {
		if (isNullish(transaction.transaction.timestamp)) {
			return { ...acc, [undefinedKey]: [...(acc['undefined'] ?? []), transaction] };
		}

		const date = formatSecondsToNormalizedDate({
			seconds: normalizeTimestampToSeconds(transaction.transaction.timestamp),
			currentDate
		});

		return { ...acc, [date]: [...(acc[date] ?? []), transaction] };
	}, {});
};

export const mapTransactionModalData = <T extends AnyTransactionUi>({
	$modalOpen,
	$modalStore
}: {
	$modalOpen: boolean;
	$modalStore: ModalData<unknown>;
}): { transaction: T | undefined; token: OptionToken } =>
	$modalOpen && nonNullish($modalStore?.data)
		? ($modalStore.data as { transaction: T; token: OptionToken })
		: { transaction: undefined, token: undefined };
