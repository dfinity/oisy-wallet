import { eip1559TransactionPrice } from '$icp/api/cketh-minter.api';
import { eip1559TransactionPriceStore } from '$icp/stores/cketh.store';
import type { IcCkToken } from '$icp/types/ic-token';
import { isTokenCkErc20Ledger } from '$icp/utils/ic-send.utils';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import { assertNonNullish, queryAndUpdate } from '@dfinity/utils';
import type { CkEthMinterDid } from '@icp-sdk/canisters/cketh';
import { AnonymousIdentity } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import { get } from 'svelte/store';

export const loadEip1559TransactionPrice = async (token: IcCkToken) => {
	const { id, minterCanisterId, ledgerCanisterId } = token;

	assertNonNullish(minterCanisterId, get(i18n).init.error.minter_cketh_info);

	await queryAndUpdate<CkEthMinterDid.Eip1559TransactionPrice>({
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
				id,
				data: {
					data: price,
					certified
				}
			}),
		onUpdateError: ({ error: err }) => {
			eip1559TransactionPriceStore.reset(id);

			toastsError({
				msg: { text: get(i18n).init.error.transaction_price },
				err
			});
		},
		identity: new AnonymousIdentity()
	});
};
