import { getTransactions as getTransactionsIcp } from '$icp/api/icp-index.api';
import { getTransactions as getTransactionsIcrc } from '$icp/api/icrc-index.api';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import type { IcGetTransactions, IcToken } from '$icp/types/ic';
import { queryAndUpdate } from '$lib/actors/query.ic';
import { toastsError } from '$lib/stores/toasts.store';
import type { OptionIdentity } from '$lib/types/identity';
import { Principal } from '@dfinity/principal';

const getTransactions = async ({
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

export const loadNextTransactions = async ({
	token: { id: tokenId, ...token },
	identity,
	signalEnd,
	...rest
}: {
	owner: Principal;
	identity: OptionIdentity;
	start?: bigint;
	maxResults?: bigint;
	token: IcToken;
	signalEnd: () => void;
}): Promise<void> =>
	queryAndUpdate<IcGetTransactions>({
		request: (params) =>
			getTransactions({
				token: { id: tokenId, ...token },
				...rest,
				...params
			}),
		onLoad: ({ response: { transactions }, certified }) => {
			if (transactions.length === 0) {
				signalEnd();
				return;
			}

			icTransactionsStore.append({
				tokenId,
				transactions: transactions.map((data) => ({ data, certified }))
			});
		},
		onError: ({ error: err, certified }) => {
			console.error(err);

			if (!certified) {
				return;
			}

			icTransactionsStore.reset(tokenId);

			toastsError({
				msg: { text: 'Something went wrong while fetching the transactions.' },
				err
			});

			signalEnd();
		},
		identity
	});
