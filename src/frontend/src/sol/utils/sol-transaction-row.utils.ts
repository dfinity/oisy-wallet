import { isNullish, nonNullish } from '@dfinity/utils';
import type { TransactionRowUi } from '$lib/types/transaction-row';
import type { Token } from '$lib/types/token';
import type { TransactionStatus } from '$lib/types/transaction';
import type { SolTransactionUi } from '$sol/types/sol-transaction';

interface SolRowLabelI18n {
	send: string;
	receive: string;
}

export interface SolTransactionRowViewModel {
	row: TransactionRowUi;
	label: string;
}

export const mapSolTransactionToRowUi = ({
	transaction: { type, timestamp, status, to, from, toOwner, fromOwner, display },
	token
}: {
	transaction: SolTransactionUi;
	token: Token;
}): TransactionRowUi => {
	const transactionStatus: TransactionStatus =
		status === 'processed' || isNullish(status) ? 'pending' : 'confirmed';

	return {
		displayAmount: display.amount,
		type,
		status: transactionStatus,
		timestamp: nonNullish(timestamp) ? Number(timestamp) : timestamp,
		to: toOwner ?? to,
		from: fromOwner ?? from,
		token
	};
};

export const mapSolTransactionToViewModel = ({
	transaction,
	token,
	i18n
}: {
	transaction: SolTransactionUi;
	token: Token;
	i18n: SolRowLabelI18n;
}): SolTransactionRowViewModel => ({
	row: mapSolTransactionToRowUi({ transaction, token }),
	label: transaction.type === 'send' ? i18n.send : i18n.receive
});
