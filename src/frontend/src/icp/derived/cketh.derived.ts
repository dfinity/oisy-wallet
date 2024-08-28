import { eip1559TransactionPriceStore } from '$icp/stores/cketh.store';
import { token } from '$lib/stores/token.store';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const ckErc20ToErc20MaxTransactionFee: Readable<bigint | undefined> = derived(
	[eip1559TransactionPriceStore, token],
	([$eip1559TransactionPriceStore, $token]) =>
		nonNullish($token)
			? $eip1559TransactionPriceStore?.[$token.id]?.data.max_transaction_fee
			: undefined
);
