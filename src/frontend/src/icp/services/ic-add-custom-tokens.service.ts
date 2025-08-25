import { getLedgerId, getTransactions as getTransactionsIcrc } from '$icp/api/icrc-index-ng.api';
import { metadata } from '$icp/api/icrc-ledger.api';
import type { IcCanisters, IcToken, IcTokenWithoutId } from '$icp/types/ic';
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

export const loadAndAssertAddCustomToken = async ({
	identity,
	icrcTokens,
	ledgerCanisterId,
	indexCanisterId
}: Partial<IcCanisters> & { identity: OptionIdentity; icrcTokens: IcToken[] }): Promise<{
	result: 'success' | 'error';
	data?: {
		token: IcTokenWithoutId;
		balance: bigint;
	};
}> => {
	assertNonNullish(identity);

	if (isNullish(ledgerCanisterId)) {
		toastsError({
			msg: { text: get(i18n).tokens.import.error.missing_ledger_id }
		});
		return { result: 'error' };
	}

	if (isNullish(indexCanisterId)) {
		toastsError({
			msg: { text: get(i18n).tokens.import.error.missing_index_id }
		});
		return { result: 'error' };
	}

	const canisterIds = { ledgerCanisterId, indexCanisterId };

	const { alreadyAvailable } = assertAlreadyAvailable({
		icrcTokens,
		...canisterIds
	});

	if (alreadyAvailable) {
		return { result: 'error' };
	}

	const { valid } = await assertLedgerId({
		identity,
		...canisterIds
	});

	if (!valid) {
		return { result: 'error' };
	}

	try {
		const [token, balance] = await Promise.all([
			loadMetadata({
				identity,
				...canisterIds
			}),
			loadBalance({ identity, ...canisterIds })
		]);

		if (isNullish(token)) {
			toastsError({
				msg: { text: get(i18n).tokens.import.error.no_metadata }
			});

			return { result: 'error' };
		}

		const { valid } = assertExistingTokens({ token, icrcTokens });

		if (!valid) {
			return { result: 'error' };
		}

		return { result: 'success', data: { token, balance } };
	} catch (err: unknown) {
		return { result: 'error' };
	}
};

const assertExistingTokens = ({
	icrcTokens,
	token
}: {
	icrcTokens: IcToken[];
	token: IcTokenWithoutId;
}): { valid: boolean } => {
	if (
		icrcTokens.find(
			({ symbol, name }) =>
				symbol.toLowerCase() === token.symbol.toLowerCase() ||
				name.toLowerCase() === token.name.toLowerCase()
		) !== undefined
	) {
		toastsError({
			msg: { text: get(i18n).tokens.error.duplicate_metadata }
		});

		return { valid: false };
	}

	return { valid: true };
};

const assertAlreadyAvailable = ({
	icrcTokens,
	ledgerCanisterId
}: {
	icrcTokens: IcToken[];
} & IcCanisters): { alreadyAvailable: boolean } => {
	if (icrcTokens?.find(({ ledgerCanisterId: id }) => id === ledgerCanisterId) !== undefined) {
		toastsError({
			msg: { text: get(i18n).tokens.error.already_available }
		});

		return { alreadyAvailable: true };
	}

	return { alreadyAvailable: false };
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

const assertLedgerId = async ({
	identity,
	indexCanisterId,
	ledgerCanisterId
}: IcCanisters & { identity: Identity }): Promise<{ valid: boolean }> => {
	try {
		const ledgerId = await getLedgerId({
			indexCanisterId,
			identity,
			certified: true
		});

		if (ledgerCanisterId !== ledgerId.toText()) {
			toastsError({
				msg: { text: get(i18n).tokens.import.error.invalid_ledger_id }
			});

			return { valid: false };
		}

		return { valid: true };
	} catch (err: unknown) {
		toastsError({
			msg: { text: get(i18n).tokens.import.error.unexpected_index_ledger },
			err
		});

		return { valid: false };
	}
};
