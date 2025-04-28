import { icPendingTransactionsStore } from '$icp/stores/ic-pending-transactions.store';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import { tokens } from '$lib/derived/tokens.derived';
import { balancesStore } from '$lib/stores/balances.store';
import type { PostMessageDataResponseWallet } from '$lib/types/post-message';
import type { TokenId } from '$lib/types/token';
import { isNullish, jsonReviver } from '@dfinity/utils';
import { get } from 'svelte/store';

export const syncWallet = ({
	data,
	tokenId
}: {
	data: PostMessageDataResponseWallet;
	tokenId: TokenId;
}) => {
	const {
		wallet: {
			balance: { certified, data: balance },
			newTransactions
		}
	} = data;
	console.log(
		'syncWallet',
		{ tokenId, balance },
		get(tokens).find((t) => t.id === tokenId)
	);

	const balanceForPendingTxs =
		get(icPendingTransactionsStore)?.[tokenId]?.reduce(
			(prev, tx) => (tx.data && tx.data.value ? prev + tx.data.value : prev),
			balance
		) ?? balance;

	console.log('balanceForPendingTxs', balanceForPendingTxs);

	balancesStore.set({
		tokenId,
		data: {
			data: balanceForPendingTxs,
			certified
		}
	});

	if (isNullish(newTransactions)) {
		icTransactionsStore.nullify(tokenId);
		return;
	}

	icTransactionsStore.prepend({
		tokenId,
		transactions: JSON.parse(newTransactions, jsonReviver)
	});
};
