import { nonNullish } from '@dfinity/utils';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import { NANO_SECONDS_IN_SECOND } from '$lib/constants/app.constants';
import type { TransactionRowUi } from '$lib/types/transaction-row';
import type { TransactionStatus } from '$lib/types/transaction';
import type { Token } from '$lib/types/token';

export interface IcTransactionLabelUi {
	amount: bigint;
	type: IcTransactionUi['type'];
	label?: string;
}

export interface IcTransactionRowViewModel {
	row: TransactionRowUi;
	label: IcTransactionLabelUi;
}

export const mapIcTransactionToRowUi = ({
	transaction: { type, timestamp: timestampNanoseconds, to, from, approveSpender, display, status },
	token
}: {
	transaction: IcTransactionUi;
	token: Token;
}): TransactionRowUi => ({
	displayAmount: display.amount,
	type,
	status: (status === 'pending' ? 'pending' : 'confirmed') as TransactionStatus,
	timestamp: nonNullish(timestampNanoseconds)
		? Number(timestampNanoseconds / NANO_SECONDS_IN_SECOND)
		: undefined,
	to,
	from,
	approveSpender,
	token
});

export const mapIcTransactionToViewModel = ({
	transaction,
	token
}: {
	transaction: IcTransactionUi;
	token: Token;
}): IcTransactionRowViewModel => ({
	row: mapIcTransactionToRowUi({ transaction, token }),
	label: {
		amount: transaction.display.labelAmount,
		type: transaction.type,
		label: transaction.typeLabel
	}
});
