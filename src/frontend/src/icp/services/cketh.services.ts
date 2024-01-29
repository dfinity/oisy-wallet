import { eip1559TransactionPrice } from '$icp/api/cketh-minter.api';
import { eip1559TransactionPriceStore } from '$icp/stores/cketh.store';
import type { IcCkCanisters, IcToken } from '$icp/types/ic';
import { AnonymousIdentity } from '@dfinity/agent';
import { assertNonNullish } from '@dfinity/utils';

export const loadEip1559TransactionPrice = async ({
	id: tokenId,
	minterCanisterId
}: IcToken & Partial<IcCkCanisters>) => {
	try {
		assertNonNullish(minterCanisterId, 'A configured minter is required to fetch the ckBTC info.');

		const price = await eip1559TransactionPrice({
			identity: new AnonymousIdentity(),
			minterCanisterId
		});

		eip1559TransactionPriceStore.set({
			tokenId,
			data: {
				data: price,
				certified: true
			}
		});
	} catch (err: unknown) {
		// TODO(GIX-2230): We silent the error as those are estimation only and we are going to improve the UX
		console.error(err);
	}
};
