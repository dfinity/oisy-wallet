import type { IcPendingTransactionsData } from '$icp/stores/ic-pending-transactions.store';
import type { IcCertifiedTransactionsData } from '$icp/stores/ic-transactions.store';
import type { IcToken } from '$icp/types/ic-token';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import { GLDT_STAKE_CANISTER_ID } from '$lib/constants/app.constants';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { CertifiedTransaction } from '$lib/stores/transactions.store';
import type { StakingTransactionsUiWithToken } from '$lib/types/transaction-ui';

export const getGldtStakingTransactions = ({
	gldtToken,
	goldaoToken,
	icTransactionsStore,
	icPendingTransactionsStore
}: {
	gldtToken: IcToken;
	goldaoToken: IcToken;
	icTransactionsStore: IcCertifiedTransactionsData;
	icPendingTransactionsStore: CertifiedStoreData<IcPendingTransactionsData>;
}): StakingTransactionsUiWithToken[] => {
	const gldtTxs = [
		...((icTransactionsStore?.[gldtToken.id] as CertifiedTransaction<IcTransactionUi>[]) ?? []),
		...((icPendingTransactionsStore?.[gldtToken.id] as IcPendingTransactionsData) ?? [])
	];

	const goldaoTxs = [
		...(icTransactionsStore?.[goldaoToken.id] as CertifiedTransaction<IcTransactionUi>[]),
		...(icPendingTransactionsStore?.[goldaoToken.id] as IcPendingTransactionsData)
	];

	return [...gldtTxs, ...goldaoTxs].reduce<StakingTransactionsUiWithToken[]>((acc, tx) => {
		const isGldtTx = gldtTxs.includes(tx);
		const isReward = !isGldtTx;
		const token = isGldtTx ? gldtToken : goldaoToken;

		const { data } = tx;

		if (data.from?.includes(GLDT_STAKE_CANISTER_ID) || data.to?.includes(GLDT_STAKE_CANISTER_ID)) {
			acc.push({
				...data,
				token,
				isReward
			});
		}

		return acc;
	}, []);
};
