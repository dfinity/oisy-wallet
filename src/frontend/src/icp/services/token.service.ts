import { getTransactions as getTransactionsIcrc } from '$icp/api/icrc-index-ng.api';
import { metadata } from '$icp/api/icrc-ledger.api';
import type { IcCanisters, IcTokenWithoutId } from '$icp/types/ic';
import { mapIcrcToken } from '$icp/utils/icrc.utils';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { OptionIdentity } from '$lib/types/identity';
import type { Identity } from '@dfinity/agent';
import { assertNonNullish, isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export interface ValidateTokenData {
	token: IcTokenWithoutId;
	balance: bigint;
}

export const loadAndAssertCustomToken = async ({
	identity,
	...rest
}: IcCanisters & { identity: OptionIdentity }): Promise<{
	result: 'success' | 'error';
	data?: {
		token: IcTokenWithoutId;
		balance: bigint;
	};
}> => {
	assertNonNullish(identity);

	const [tokenResult, balanceResult] = await Promise.allSettled([
		loadMetadata({
			identity,
			...rest
		}),
		loadBalance({ identity, ...rest })
	]);

	if (tokenResult.status === 'rejected' || balanceResult.status === 'rejected') {
		return { result: 'error' };
	}

	const { value: token } = tokenResult;

	if (isNullish(token)) {
		// TODO: toad
		return { result: 'error' };
	}

	const { value: balance } = balanceResult;

	return { result: 'success', data: { token, balance } };
};

const loadMetadata = async ({
	identity,
	ledgerCanisterId,
	...rest
}: IcCanisters & { identity: Identity }): Promise<IcTokenWithoutId | undefined> => {
	try {
		return mapIcrcToken({
			ledgerCanisterId,
			metadata: await metadata({ ledgerCanisterId, identity, certified: true }),
			exchangeCoinId: 'internet-computer',
			// Position does not matter here
			position: Number.MAX_VALUE,
			...rest
		});
	} catch (err: unknown) {
		// TODO: label
		toastsError({
			msg: { text: get(i18n).init.error.btc_fees_estimation },
			err
		});

		throw err;
	}
};

const loadBalance = async ({
	identity,
	indexCanisterId
}: Pick<IcCanisters, 'indexCanisterId'> & { identity: Identity }): Promise<bigint> => {
	try {
		const { balance } = await getTransactionsIcrc({
			indexCanisterId,
			identity,
			owner: identity.getPrincipal(),
			maxResults: 0n,
			certified: true
		});

		return balance;
	} catch (err: unknown) {
		// TODO: label
		toastsError({
			msg: { text: get(i18n).init.error.btc_fees_estimation },
			err
		});

		throw err;
	}
};
