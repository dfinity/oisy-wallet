import { getTransactions as getTransactionsIcp } from '$icp/api/icp-index.api';
import { getTransactions as getTransactionsIcrc } from '$icp/api/icrc-index.api';
import type { IcGetTransactions, IcToken } from '$icp/types/ic';
import type { OptionIdentity } from '$lib/types/identity';
import { Principal } from '@dfinity/principal';

export const getTransactions = async ({
	token: { standard, indexCanisterId },
	...rest
}: {
	owner: Principal;
	identity: OptionIdentity;
	start?: bigint;
	maxResults?: bigint;
	token: IcToken;
}): Promise<IcGetTransactions> => {
	if (standard === 'icrc') {
		return getTransactionsIcrc({
			indexCanisterId,
			...rest
		});
	}

	return getTransactionsIcp({
		...rest
	});
};
