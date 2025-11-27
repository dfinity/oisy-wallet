import type { BtcStatusesData } from '$icp/stores/btc.store';
import type { CkBtcPendingUtxosData } from '$icp/stores/ckbtc-utxos.store';
import type { CkBtcMinterInfoData } from '$icp/stores/ckbtc.store';
import type { IcPendingTransactionsData } from '$icp/stores/ic-pending-transactions.store';
import type { IcCertifiedTransactionsData } from '$icp/stores/ic-transactions.store';
import type { IcToken } from '$icp/types/ic-token';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import { getAllIcTransactions } from '$icp/utils/ic-transactions.utils';
import { GLDT_STAKE_CANISTER_ID } from '$lib/constants/app.constants';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { CertifiedTransaction } from '$lib/stores/transactions.store';
import type { StakingTransactionsUiWithToken } from '$lib/types/transaction-ui';

export const getGldtStakingTransactions = ({
	gldtToken,
	goldaoToken,
	ckBtcPendingUtxoTransactions,
	ckEthPendingTransactions,
	icExtendedTransactions,
	icTransactionsStore,
	btcStatusesStore,
	ckBtcMinterInfoStore,
	ckBtcPendingUtxosStore,
	icPendingTransactionsStore
}: {
	gldtToken: IcToken;
	goldaoToken: IcToken;
	ckBtcPendingUtxoTransactions: CertifiedTransaction<IcTransactionUi>[];
	ckEthPendingTransactions: CertifiedTransaction<IcTransactionUi>[];
	icExtendedTransactions: CertifiedTransaction<IcTransactionUi>[];
	icTransactionsStore: IcCertifiedTransactionsData;
	btcStatusesStore: CertifiedStoreData<BtcStatusesData>;
	ckBtcMinterInfoStore: CertifiedStoreData<CkBtcMinterInfoData>;
	ckBtcPendingUtxosStore: CertifiedStoreData<CkBtcPendingUtxosData>;
	icPendingTransactionsStore: CertifiedStoreData<IcPendingTransactionsData>;
}): StakingTransactionsUiWithToken[] => {
	const gldtTxs = getAllIcTransactions({
		token: gldtToken,
		ckBtcPendingUtxoTransactions,
		ckBtcPendingUtxosStore,
		ckEthPendingTransactions,
		ckBtcMinterInfoStore,
		btcStatusesStore,
		icPendingTransactionsStore,
		icExtendedTransactions,
		icTransactionsStore
	});
	const goldaoTxs = getAllIcTransactions({
		token: goldaoToken,
		ckBtcPendingUtxoTransactions,
		ckBtcPendingUtxosStore,
		ckEthPendingTransactions,
		ckBtcMinterInfoStore,
		btcStatusesStore,
		icPendingTransactionsStore,
		icExtendedTransactions,
		icTransactionsStore
	});

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
