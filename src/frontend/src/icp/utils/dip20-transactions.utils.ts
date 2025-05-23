import type { Event } from '$declarations/xtc_ledger/xtc_ledger.did';
import type { Dip20TransactionWithId } from '$icp/types/api';
import type {
	Dip20Transaction,
	IcTransactionAddOnsInfo,
	IcTransactionUi
} from '$icp/types/ic-transaction';
import type { OptionIdentity } from '$lib/types/identity';

// TODO: implement this function
export const mapTransactionDip20ToSelf = (
	tx: Dip20TransactionWithId
): ({ transaction: Event & IcTransactionAddOnsInfo } & Pick<Dip20TransactionWithId, 'id'>)[] => {
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
	transaction: { id },
	identity: __
}: {
	transaction: Dip20Transaction;
	identity: OptionIdentity;
}): IcTransactionUi =>
	({ id: id.toString(), type: 'approve', status: 'executed' }) as IcTransactionUi;
