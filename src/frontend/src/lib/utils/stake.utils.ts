import type { IcPendingTransactionsData } from '$icp/stores/ic-pending-transactions.store';
import type { IcCertifiedTransactionsData } from '$icp/stores/ic-transactions.store';
import type { IcToken } from '$icp/types/ic-token';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import { GLDT_STAKE_CANISTER_ID } from '$lib/constants/app.constants';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { CertifiedTransaction } from '$lib/stores/transactions.store';
import type { StakingTransactionsUiWithToken } from '$lib/types/transaction-ui';
import { nonNullish } from '@dfinity/utils';

const mapGldtStakingTransaction = ({
	token,
	isReward,
	transactions
}: {
	token: IcToken;
	isReward: boolean;
	transactions: CertifiedTransaction<IcTransactionUi>[];
}): StakingTransactionsUiWithToken[] =>
	transactions.reduce<StakingTransactionsUiWithToken[]>((acc, tx) => {
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

export const getGldtStakingTransactions = ({
	gldtToken,
	goldaoToken,
	icTransactionsStore,
	icPendingTransactionsStore
}: {
	gldtToken?: IcToken;
	goldaoToken?: IcToken;
	icTransactionsStore: IcCertifiedTransactionsData;
	icPendingTransactionsStore: CertifiedStoreData<IcPendingTransactionsData>;
}): StakingTransactionsUiWithToken[] => {
	let result: StakingTransactionsUiWithToken[] = [];

	if (nonNullish(gldtToken)) {
		const gldtTxs = [
			...(nonNullish(icTransactionsStore?.[gldtToken.id])
				? (icTransactionsStore[gldtToken.id] as CertifiedTransaction<IcTransactionUi>[])
				: []),
			...(nonNullish(icPendingTransactionsStore?.[gldtToken.id])
				? (icPendingTransactionsStore[gldtToken.id] as IcPendingTransactionsData)
				: [])
		];

		result = [
			...mapGldtStakingTransaction({ transactions: gldtTxs, token: gldtToken, isReward: false })
		];
	}

	if (nonNullish(goldaoToken)) {
		const goldaoTxs = [
			...(nonNullish(icTransactionsStore?.[goldaoToken.id])
				? (icTransactionsStore[goldaoToken.id] as CertifiedTransaction<IcTransactionUi>[])
				: []),
			...(nonNullish(icPendingTransactionsStore?.[goldaoToken.id])
				? (icPendingTransactionsStore[goldaoToken.id] as IcPendingTransactionsData)
				: [])
		];

		result = [
			...result,
			...mapGldtStakingTransaction({ transactions: goldaoTxs, token: goldaoToken, isReward: true })
		];
	}

	return result;
};
