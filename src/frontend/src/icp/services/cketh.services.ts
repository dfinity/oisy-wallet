import { eip1559TransactionPrice } from '$icp/api/cketh-minter.api';
import { eip1559TransactionPriceStore } from '$icp/stores/cketh.store';
import type { IcCkToken } from '$icp/types/ic';
import { isTokenCkErc20Ledger } from '$icp/utils/ic-send.utils';
import { queryAndUpdate } from '$lib/actors/query.ic';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import { AnonymousIdentity } from '@dfinity/agent';
import type { Eip1559TransactionPrice } from '@dfinity/cketh';
import { Principal } from '@dfinity/principal';
import { assertNonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const loadEip1559TransactionPrice = async (token: IcCkToken) => {
	const { id: tokenId, minterCanisterId, ledgerCanisterId } = token;

	assertNonNullish(minterCanisterId, get(i18n).init.error.minter_cketh_info);

	await queryAndUpdate<Eip1559TransactionPrice>({
		request: (params) =>
			eip1559TransactionPrice({
				minterCanisterId,
				...(isTokenCkErc20Ledger(token) && {
					ckErc20LedgerId: Principal.fromText(ledgerCanisterId)
				}),
				...params
			}),
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
				msg: { text: get(i18n).init.error.transaction_price },
				err
			});
		},
		identity: new AnonymousIdentity()
	});
};
