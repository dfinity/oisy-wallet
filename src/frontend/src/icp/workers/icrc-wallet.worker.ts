import { getTransactions as getTransactionsApi } from '$icp/api/icrc-index.api';
import type { IcTransactionToSelf } from '$icp/types/ic';
import { type TimerWorkerUtilsJobParams } from '$icp/worker-utils/timer.worker-utils';
import { WalletWorkerUtils } from '$icp/worker-utils/wallet.worker-utils';
import type { PostMessage, PostMessageDataRequestIcrc } from '$lib/types/post-message';
import {
	encodeIcrcAccount,
	type IcrcGetTransactions,
	type IcrcTransaction,
	type IcrcTransactionWithId
} from '@dfinity/ledger-icrc';
import { assertNonNullish, fromNullable, isNullish } from '@dfinity/utils';

const getTransactions = ({
	identity,
	certified,
	data
}: TimerWorkerUtilsJobParams<PostMessageDataRequestIcrc>): Promise<IcrcGetTransactions> => {
	assertNonNullish(data, 'No data - indexCanisterId - provided to fetch transactions.');

	return getTransactionsApi({
		identity,
		certified,
		owner: identity.getPrincipal(),
		// We query tip to discover the new transactions
		start: undefined,
		...data
	});
};

const mapToSelfTransaction = (
	tx: IcrcTransactionWithId
): ({ transaction: IcrcTransaction & IcTransactionToSelf } & Pick<
	IcrcTransactionWithId,
	'id'
>)[] => {
	const { transaction, id } = tx;
	const { transfer: t } = transaction;

	const transfer = fromNullable(t);

	if (isNullish(transfer)) {
		return [
			{
				id,
				transaction: {
					...transaction,
					toSelf: false
				}
			}
		];
	}

	const { from, to } = transfer;

	const isSelfTransaction =
		encodeIcrcAccount({
			owner: from.owner,
			subaccount: fromNullable(from.subaccount)
		}).toLowerCase() ===
		encodeIcrcAccount({
			owner: to.owner,
			subaccount: fromNullable(to.subaccount)
		}).toLowerCase();

	return [
		{
			id,
			transaction: {
				...transaction,
				toSelf: false
			}
		},
		...(isSelfTransaction
			? [
					{
						id,
						transaction: {
							...transaction,
							toSelf: true
						}
					}
				]
			: [])
	];
};

const worker: WalletWorkerUtils<
	IcrcTransaction,
	IcrcTransactionWithId,
	PostMessageDataRequestIcrc
> = new WalletWorkerUtils(getTransactions, mapToSelfTransaction, 'syncIcrcWallet');

onmessage = async ({ data: dataMsg }: MessageEvent<PostMessage<PostMessageDataRequestIcrc>>) => {
	const { msg, data } = dataMsg;

	switch (msg) {
		case 'stopIcrcWalletTimer':
			worker.stop();
			return;
		case 'startIcrcWalletTimer':
			await worker.start(data);
			return;
	}
};
