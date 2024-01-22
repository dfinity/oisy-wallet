import type { IcrcTransaction } from '$icp/types/ic';
import { encodeIcrcAccount, type IcrcTransactionWithId } from '@dfinity/ledger-icrc';
import { fromNullable, isNullish } from '@dfinity/utils';

export const mapTransactionIcrcToSelf = (tx: IcrcTransactionWithId): IcrcTransaction[] => {
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
