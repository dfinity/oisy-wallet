import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
import { balancesStore } from '$lib/stores/balances.store';
import type { PostMessageDataResponseWallet } from '$lib/types/post-message';
import type { TokenId } from '$lib/types/token';
import { jsonReviver } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';

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

	balancesStore.set({
		tokenId,
		data: {
			data: BigNumber.from(balance),
			certified
		}
	});

	// TODO(OISY-296): set nullish if newTransactions is null
	// TODO: also verify why we have a particular implementation here?
	btcTransactionsStore.prepend({
		tokenId,
		transactions: JSON.parse(newTransactions ?? '[]', jsonReviver)
	});
};
