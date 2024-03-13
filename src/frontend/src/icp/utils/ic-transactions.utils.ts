import { ICP_TOKEN_ID } from '$icp-eth/constants/tokens.constants';
import type { BtcStatusesData } from '$icp/stores/btc.store';
import type { IcCertifiedTransaction } from '$icp/stores/ic-transactions.store';
import type {
	IcCkToken,
	IcpTransaction,
	IcrcTransaction,
	IcToken,
	IcTransaction,
	IcTransactionUi
} from '$icp/types/ic';
import { extendCkBTCTransaction, mapCkBTCTransaction } from '$icp/utils/ckbtc-transactions.utils';
import { mapCkETHTransaction } from '$icp/utils/cketh-transactions.utils';
import { isTokenCkBtcLedger, isTokenCkEthLedger } from '$icp/utils/ic-send.utils';
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
	const { id: tokenId } = token;

	if (tokenId === ICP_TOKEN_ID) {
		return mapIcpTransaction({ transaction: transaction as IcpTransaction, ...rest });
	}

	if (isTokenCkBtcLedger(token)) {
		return mapCkBTCTransaction({
			transaction: transaction as IcrcTransaction,
			ledgerCanisterId: (token as IcCkToken).ledgerCanisterId,
			...rest
		});
	}

	if (isTokenCkEthLedger(token)) {
		return mapCkETHTransaction({
			transaction: transaction as IcrcTransaction,
			ledgerCanisterId: (token as IcCkToken).ledgerCanisterId,
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
