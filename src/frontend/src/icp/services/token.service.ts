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

	try {
		const [token, balance] = await Promise.all([
			loadMetadata({
				identity,
				...rest
			}),
			loadBalance({ identity, ...rest })
		]);

		if (isNullish(token)) {
			toastsError({
				msg: { text: get(i18n).tokens.import.error.no_metadata }
			});

			return { result: 'error' };
		}

		return { result: 'success', data: { token, balance } };
	} catch (err: unknown) {
		return { result: 'error' };
	}
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
			category: 'custom',
			...rest
		});
	} catch (err: unknown) {
		toastsError({
			msg: { text: get(i18n).tokens.import.error.loading_metadata },
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
		toastsError({
			msg: { text: get(i18n).tokens.import.error.unexpected_index },
			err
		});

		throw err;
	}
};
