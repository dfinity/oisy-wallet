import type {
	IcpTransaction,
	IcrcTransaction,
	IcToken,
	IcTransaction,
	IcTransactionUi
} from '$icp/types/ic';
import { mapCkBTCTransaction } from '$icp/utils/ckbtc-transactions.utils';
import { isTokenCkBtcLedger } from '$icp/utils/ic-send.utils';
import { mapIcpTransaction } from '$icp/utils/icp-transactions.utils';
import { mapIcrcTransaction } from '$icp/utils/icrc-transactions.utils';
import { ICP_TOKEN_ID } from '$lib/constants/tokens.constants';
import type { OptionIdentity } from '$lib/types/identity';

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
		return mapCkBTCTransaction({ transaction: transaction as IcrcTransaction, ...rest });
	}

	return mapIcrcTransaction({ transaction: transaction as IcrcTransaction, ...rest });
};
