import type { IcTransactionToSelf } from '$icp/types/ic';
import type { Transaction, TransactionWithId } from '@dfinity/ledger-icp';

export const mapTransactionIcpToSelf = (
	tx: TransactionWithId
): ({ transaction: Transaction & IcTransactionToSelf } & Pick<TransactionWithId, 'id'>)[] => {
	const { transaction, id } = tx;
	const { operation } = transaction;

	if (!('Transfer' in operation)) {
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

	const {
		Transfer: { from, to }
	} = operation;

	return [
		{
			id,
			transaction: {
				...transaction,
				toSelf: false
			}
		},
		...(from.toLowerCase() === to.toLowerCase()
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
