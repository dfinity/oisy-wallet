import type { IcTransactionUi } from '$icp/types/ic';
import { CKETH_EXPLORER_URL, ETHEREUM_EXPLORER_URL } from '$lib/constants/explorers.constants';
import type { TransactionResponse } from '@ethersproject/abstract-provider';

export const mapCkETHPendingTransaction = ({
	transaction: { hash, from, to, value }
}: {
	transaction: TransactionResponse;
}): IcTransactionUi => ({
	id: hash,
	incoming: false,
	type: 'burn',
	status: 'pending',
	from,
	fromExplorerUrl: `${CKETH_EXPLORER_URL}/address/${from}`,
	to,
	toExplorerUrl: `${CKETH_EXPLORER_URL}/address/${to}`,
	typeLabel: 'Converting ETH to ckETH',
	value: value.toBigInt(),
	txExplorerUrl: `${ETHEREUM_EXPLORER_URL}/tx/${hash}`
});
