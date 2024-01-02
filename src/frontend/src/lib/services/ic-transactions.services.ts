import { getTransactions as getTransactionsIcp } from '$lib/api/icp-index.api';
import { getTransactions as getTransactionsIcrc } from '$lib/api/icrc-index.api';
import type { IcGetTransactions } from '$lib/types/ic';
import type { IcrcToken } from '$lib/types/icrc';
import type { OptionIdentity } from '$lib/types/identity';
import { Principal } from '@dfinity/principal';

export const getTransactions = async ({
	standard,
	...rest
}: {
	owner: Principal;
	identity: OptionIdentity;
	start?: bigint;
	maxResults?: bigint;
} & Pick<IcrcToken, 'standard' | 'indexCanisterId'>): Promise<IcGetTransactions> => {
	if (standard === 'icrc') {
		return getTransactionsIcrc({
			...rest
		});
	}

	return getTransactionsIcp({
		...rest
	});
};
