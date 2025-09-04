import type { BtcStatusesData } from '$icp/stores/btc.store';
import type { CkBtcPendingUtxosData } from '$icp/stores/ckbtc-utxos.store';
import type { CkBtcMinterInfoData } from '$icp/stores/ckbtc.store';
import type { IcPendingTransactionsData } from '$icp/stores/ic-pending-transactions.store';
import type {
	IcCertifiedTransaction,
	IcCertifiedTransactionsData
} from '$icp/stores/ic-transactions.store';
import type { IcCkToken, IcToken } from '$icp/types/ic-token';
import type {
	IcTransaction,
	IcTransactionUi,
	IcpTransaction,
	IcrcTransaction
} from '$icp/types/ic-transaction';
import {
	extendCkBTCTransaction,
	getCkBtcPendingUtxoTransactions,
	mapCkBTCTransaction
} from '$icp/utils/ckbtc-transactions.utils';
import {
	getCkEthPendingTransactions,
	mapCkEthereumTransaction
} from '$icp/utils/cketh-transactions.utils';
import {
	isTokenCkBtcLedger,
	isTokenCkErc20Ledger,
	isTokenCkEthLedger
} from '$icp/utils/ic-send.utils';
import { mapIcpTransaction } from '$icp/utils/icp-transactions.utils';
import { mapIcrcTransaction } from '$icp/utils/icrc-transactions.utils';
import { isTokenIcp } from '$icp/utils/icrc.utils';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { CertifiedTransaction } from '$lib/stores/transactions.store';
import type { OptionIdentity } from '$lib/types/identity';
import type { Token } from '$lib/types/token';

export const mapIcTransaction = ({
	transaction,
	token,
	...rest
}: {
	transaction: IcTransaction;
	token: IcToken;
	identity: OptionIdentity;
}): IcTransactionUi => {
	const {
		network: { env }
	} = token;

	if (isTokenIcp(token)) {
		return mapIcpTransaction({ transaction: transaction as IcpTransaction, ...rest });
	}

	if (isTokenCkBtcLedger(token)) {
		return mapCkBTCTransaction({
			transaction: transaction as IcrcTransaction,
			ledgerCanisterId: (token as IcCkToken).ledgerCanisterId,
			env,
			...rest
		});
	}

	if (isTokenCkEthLedger(token) || isTokenCkErc20Ledger(token)) {
		return mapCkEthereumTransaction({
			transaction: transaction as IcrcTransaction,
			ledgerCanisterId: (token as IcCkToken).ledgerCanisterId,
			env,
			...rest
		});
	}

	return mapIcrcTransaction({ transaction: transaction as IcrcTransaction, ...rest });
};

export const extendIcTransaction = ({
	transaction,
	btcStatuses,
	token
}: {
	transaction: IcCertifiedTransaction;
	btcStatuses: BtcStatusesData | undefined;
	token: Token;
}): IcCertifiedTransaction => {
	if (isTokenCkBtcLedger(token)) {
		return extendCkBTCTransaction({
			transaction,
			btcStatuses
		});
	}

	return transaction;
};

export const getIcExtendedTransactions = ({
	token,
	icTransactionsStore,
	btcStatusesStore
}: {
	token: Token;
	icTransactionsStore: IcCertifiedTransactionsData;
	btcStatusesStore: CertifiedStoreData<BtcStatusesData>;
}) =>
	(icTransactionsStore?.[token.id] ?? []).map((transaction) =>
		extendIcTransaction({
			transaction,
			token,
			btcStatuses: btcStatusesStore?.[token.id] ?? undefined
		})
	);

export const getAllIcTransactions = ({
	token,
	icTransactionsStore,
	btcStatusesStore,
	ckBtcMinterInfoStore,
	ckBtcPendingUtxosStore,
	icPendingTransactionsStore
}: {
	token: Token;
	ckBtcPendingUtxoTransactions: CertifiedTransaction<IcTransactionUi>[];
	ckEthPendingTransactions: CertifiedTransaction<IcTransactionUi>[];
	icExtendedTransactions: CertifiedTransaction<IcTransactionUi>[];
	icTransactionsStore: IcCertifiedTransactionsData;
	btcStatusesStore: CertifiedStoreData<BtcStatusesData>;
	ckBtcMinterInfoStore: CertifiedStoreData<CkBtcMinterInfoData>;
	ckBtcPendingUtxosStore: CertifiedStoreData<CkBtcPendingUtxosData>;
	icPendingTransactionsStore: CertifiedStoreData<IcPendingTransactionsData>;
}) => [
	...getCkBtcPendingUtxoTransactions({ token, ckBtcPendingUtxosStore, ckBtcMinterInfoStore }),
	...getCkEthPendingTransactions({ token, icPendingTransactionsStore }),
	...getIcExtendedTransactions({ token, icTransactionsStore, btcStatusesStore })
];
