import { getTransactions as getTransactionsIcp } from '$icp/api/icp-index.api';
import { getTransactions as getTransactionsIcrc } from '$icp/api/icrc-index-ng.api';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import type { IcCanistersStrict, IcToken } from '$icp/types/ic-token';
import type { IcTransaction } from '$icp/types/ic-transaction';
import { mapIcTransaction } from '$icp/utils/ic-transactions.utils';
import { mapTransactionIcpToSelf } from '$icp/utils/icp-transactions.utils';
import { mapTransactionIcrcToSelf } from '$icp/utils/icrc-transactions.utils';
import { isTokenIcrc } from '$icp/utils/icrc.utils';
import { balancesStore } from '$lib/stores/balances.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { OptionIdentity } from '$lib/types/identity';
import type { TokenId } from '$lib/types/token';
import type { Principal } from '@dfinity/principal';
import { queryAndUpdate } from '@dfinity/utils';
import { get } from 'svelte/store';

const getTransactions = async ({
	token: { standard, indexCanisterId },
	...rest
}: {
	owner: Principal;
	identity: OptionIdentity;
	start?: bigint;
	maxResults?: bigint;
	token: IcToken & IcCanistersStrict;
}): Promise<IcTransaction[]> => {
	if (isTokenIcrc({ standard })) {
		const { transactions } = await getTransactionsIcrc({
			indexCanisterId,
			...rest
		});
		return transactions.flatMap(mapTransactionIcrcToSelf);
	}

	const { transactions } = await getTransactionsIcp({
		...rest
	});
	return transactions.flatMap(mapTransactionIcpToSelf);
};

export const loadNextTransactions = ({
	token,
	identity,
	signalEnd,
	...rest
}: {
	owner: Principal;
	identity: OptionIdentity;
	start?: bigint;
	maxResults?: bigint;
	token: IcToken & IcCanistersStrict;
	signalEnd: () => void;
}): Promise<void> =>
	queryAndUpdate<IcTransaction[]>({
		request: (params) =>
			getTransactions({
				token,
				...rest,
				...params
			}),
		onLoad: ({ response: transactions, certified }) => {
			if (transactions.length === 0) {
				signalEnd();
				return;
			}

			icTransactionsStore.append({
				tokenId: token.id,
				transactions: transactions.map((transaction) => ({
					data: mapIcTransaction({
						transaction,
						token,
						identity
					}),
					certified
				}))
			});
		},
		onUpdateError: ({ error }) => {
			onLoadTransactionsError({ tokenId: token.id, error });

			signalEnd();
		},
		identity
	});

export const onLoadTransactionsError = ({
	tokenId,
	error: err,
	silent = false
}: {
	tokenId: TokenId;
	error: unknown;
	silent?: boolean;
}) => {
	icTransactionsStore.reset(tokenId);

	// We get transactions and balance for the same end point therefore if getting certified transactions fails, it also means the balance is incorrect.
	balancesStore.reset(tokenId);

	if (silent) {
		// We print the error to console just for debugging purposes
		console.warn(`${get(i18n).transactions.error.loading_transactions}:`, err);
		return;
	}

	toastsError({
		msg: { text: get(i18n).transactions.error.loading_transactions },
		err
	});
};

export const onTransactionsCleanUp = (data: { tokenId: TokenId; transactionIds: string[] }) => {
	icTransactionsStore.cleanUp(data);

	toastsError({
		msg: {
			text: get(i18n).transactions.error.uncertified_transactions_removed
		}
	});
};
