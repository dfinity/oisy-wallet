import type { IcTransactionUi } from '$icp/types/ic';
import { ETHEREUM_EXPLORER_URL } from '$lib/constants/explorers.constants';
import { notEmptyString } from '@dfinity/utils/dist/types/utils/nullish.utils';
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
	...(notEmptyString(ETHEREUM_EXPLORER_URL) && {
		fromExplorerUrl: `${ETHEREUM_EXPLORER_URL}/address/${from}`,
		toExplorerUrl: `${ETHEREUM_EXPLORER_URL}/address/${to}`,
		txExplorerUrl: `${ETHEREUM_EXPLORER_URL}/tx/${hash}`
	})
});
