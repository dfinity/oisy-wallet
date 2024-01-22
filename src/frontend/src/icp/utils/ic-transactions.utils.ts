import type {
	IcpTransaction,
	IcrcTransaction,
	IcTransaction,
	IcTransactionUi
} from '$icp/types/ic';
import { mapIcpTransaction } from '$icp/utils/icp-transactions.utils';
import { mapIcrcTransaction } from '$icp/utils/icrc-transactions.utils';
import { ICP_TOKEN_ID } from '$lib/constants/tokens.constants';
import type { OptionIdentity } from '$lib/types/identity';
import type { TokenId } from '$lib/types/token';

export const mapIcTransaction = ({
	transaction,
	tokenId,
	...rest
}: {
	transaction: IcTransaction;
	tokenId: TokenId;
	identity: OptionIdentity;
}): IcTransactionUi => {
	if (tokenId === ICP_TOKEN_ID) {
		return mapIcpTransaction({ transaction: transaction as IcpTransaction, ...rest });
	}

	return mapIcrcTransaction({ transaction: transaction as IcrcTransaction, ...rest });
};
