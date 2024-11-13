import type { BtcTransactionUi } from '$btc/types/btc';
import type { EthTransactionUi } from '$eth/types/eth-transaction';
import type { IcTransactionUi } from '$icp/types/ic-transaction';

export const createTransactionsUi = (
	n: number
): (BtcTransactionUi | EthTransactionUi | IcTransactionUi)[] =>
	Array.from({ length: n }, (_, i) => ({
		id: `id-${i}`,
		type: 'send',
		status: 'executed',
		transactionComponent: 'transactionComponent',
		timestamp: BigInt(i),
		from: 'from',
		to: 'to'
	}));
