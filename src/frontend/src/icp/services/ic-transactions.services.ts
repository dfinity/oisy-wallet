import type { OptionIdentity } from '$lib/types/identity';
import { Principal } from '@dfinity/principal';
import { getTransactions as getTransactionsIcp } from '../api/icp-index.api';
import { getTransactions as getTransactionsIcrc } from '../api/icrc-index.api';
import type { IcGetTransactions, IcToken } from '../types/ic';

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
