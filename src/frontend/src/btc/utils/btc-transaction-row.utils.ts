import { nonNullish } from '@dfinity/utils';
import type { BtcTransactionUi } from '$btc/types/btc';
import type { TransactionRowUi } from '$lib/types/transaction-row';
import type { Token } from '$lib/types/token';

interface BtcRowLabelI18n {
	send: string;
	receive: string;
}

export interface BtcTransactionRowViewModel {
	row: TransactionRowUi;
	label: string;
}

export const mapBtcTransactionToRowUi = ({
	transaction: { display, type, status, timestamp, to, from },
	token
}: {
	transaction: BtcTransactionUi;
	token: Token;
}): TransactionRowUi => ({
	displayAmount: display.amount,
	type,
	status,
	timestamp: Number(timestamp),
	to: nonNullish(to?.[0]) ? to[0] : undefined,
	from,
	token
});

export const mapBtcTransactionToViewModel = ({
	transaction,
	token,
	i18n
}: {
	transaction: BtcTransactionUi;
	token: Token;
	i18n: BtcRowLabelI18n;
}): BtcTransactionRowViewModel => ({
	row: mapBtcTransactionToRowUi({ transaction, token }),
	label: transaction.type === 'send' ? i18n.send : i18n.receive
});
