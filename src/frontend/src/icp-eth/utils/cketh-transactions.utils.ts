import type { IcTransactionUi } from '$icp/types/ic';
import { ETHEREUM_EXPLORER_URL } from '$lib/constants/explorers.constants';
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
	to,
	typeLabel: 'Converting ETH to ckETH',
	value: value.toBigInt(),
	explorerUrl: `${ETHEREUM_EXPLORER_URL}/tx/${hash}`
});
