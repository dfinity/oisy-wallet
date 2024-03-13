import { eip1559TransactionPrice } from '$icp/api/cketh-minter.api';
import { eip1559TransactionPriceStore } from '$icp/stores/cketh.store';
import type { IcCkToken } from '$icp/types/ic';
import { queryAndUpdate } from '$lib/actors/query.ic';
import { toastsError } from '$lib/stores/toasts.store';
import { AnonymousIdentity } from '@dfinity/agent';
import type { Eip1559TransactionPrice } from '@dfinity/cketh/dist/candid/minter';
import { assertNonNullish } from '@dfinity/utils';

export const loadEip1559TransactionPrice = async ({ id: tokenId, minterCanisterId }: IcCkToken) => {
	assertNonNullish(minterCanisterId, 'A configured minter is required to fetch the ckBTC info.');

	await queryAndUpdate<Eip1559TransactionPrice>({
		request: (params) => eip1559TransactionPrice({ minterCanisterId, ...params }),
		onLoad: ({ certified, response: price }) =>
			eip1559TransactionPriceStore.set({
				tokenId,
				data: {
					data: price,
					certified
				}
			}),
		onCertifiedError: ({ error: err }) => {
			eip1559TransactionPriceStore.reset(tokenId);

			toastsError({
				msg: { text: 'Error while loading the estimation of the price of a transaction.' },
				err
			});
		},
		identity: new AnonymousIdentity()
	});
};
