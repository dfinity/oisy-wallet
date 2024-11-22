import { ICP_TOKEN_ID } from '$env/tokens/tokens.icp.env';
import type { BtcStatusesData } from '$icp/stores/btc.store';
import type { IcCertifiedTransaction } from '$icp/stores/ic-transactions.store';
import type { IcCkToken, IcToken } from '$icp/types/ic-token';
import type {
	IcTransaction,
	IcTransactionUi,
	IcpTransaction,
	IcrcTransaction
} from '$icp/types/ic-transaction';
import { extendCkBTCTransaction, mapCkBTCTransaction } from '$icp/utils/ckbtc-transactions.utils';
import { mapCkEthereumTransaction } from '$icp/utils/cketh-transactions.utils';
import {
	isTokenCkBtcLedger,
	isTokenCkErc20Ledger,
	isTokenCkEthLedger
} from '$icp/utils/ic-send.utils';
import { mapIcpTransaction } from '$icp/utils/icp-transactions.utils';
import { mapIcrcTransaction } from '$icp/utils/icrc-transactions.utils';
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
		id: tokenId,
		network: { env }
	} = token;

	if (tokenId === ICP_TOKEN_ID) {
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
