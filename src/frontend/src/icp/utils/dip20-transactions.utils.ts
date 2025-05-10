import type { Event } from '$declarations/xtc_ledger/xtc_ledger.did';
import type { TransactionWithId } from '$icp/types/api';
import type {
	Dip20Transaction,
	IcTransactionAddOnsInfo,
	IcTransactionUi
} from '$icp/types/ic-transaction';
import type { OptionIdentity } from '$lib/types/identity';

// TODO: implement this function
export const mapTransactionDip20ToSelf = (
	tx: TransactionWithId
): ({ transaction: Event & IcTransactionAddOnsInfo } & Pick<TransactionWithId, 'id'>)[] => {
	const { transaction, id } = tx;

	return [
		{
			id,
			transaction
		}
	];
};

// TODO: implement this function
export const mapDip20Transaction = ({
	transaction: _,
	identity: __
}: {
	transaction: Dip20Transaction;
	identity: OptionIdentity;
}): IcTransactionUi => ({}) as IcTransactionUi;
