import { collectionMetadata } from '$icp/api/icpunks.api';
import type {
	IcPunksCanisters,
	IcPunksToken,
	IcPunksTokenWithoutId
} from '$icp/types/icpunks-token';
import { mapIcPunksToken } from '$icp/utils/icpunks.utils';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { OptionIdentity } from '$lib/types/identity';
import { assertNonNullish, isNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';
import { get } from 'svelte/store';

export interface ValidateTokenData {
	token: IcPunksTokenWithoutId;
}

export const loadAndAssertAddCustomToken = async ({
	identity,
	icPunksTokens,
	canisterId
}: Partial<IcPunksCanisters> & {
	identity: OptionIdentity;
	icPunksTokens: IcPunksToken[];
}): Promise<{
	result: 'success' | 'error';
	data?: ValidateTokenData;
}> => {
	assertNonNullish(identity);

	if (isNullish(canisterId)) {
		toastsError({
			msg: { text: get(i18n).tokens.import.error.missing_canister_id }
		});
		return { result: 'error' };
	}

	const canisterIds = { canisterId };

	const { alreadyAvailable } = assertAlreadyAvailable({
		icPunksTokens,
		...canisterIds
	});

	if (alreadyAvailable) {
		return { result: 'error' };
	}

	try {
		const params = { identity, ...canisterIds };

		const token = await loadMetadata(params);

		if (isNullish(token)) {
			toastsError({
				msg: { text: get(i18n).tokens.import.error.no_metadata }
			});

			return { result: 'error' };
		}

		const { valid } = assertExistingTokens({ token, icPunksTokens });

		if (!valid) {
			return { result: 'error' };
		}

		return { result: 'success', data: { token } };
	} catch (_err: unknown) {
		return { result: 'error' };
	}
};

const assertExistingTokens = ({
	icPunksTokens,
	token
}: {
	icPunksTokens: IcPunksToken[];
	token: IcPunksTokenWithoutId;
}): { valid: boolean } => {
	if (
		icPunksTokens.find(
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
	icPunksTokens,
	canisterId
}: {
	icPunksTokens: IcPunksToken[];
} & IcPunksCanisters): { alreadyAvailable: boolean } => {
	if (icPunksTokens?.find(({ canisterId: id }) => id === canisterId) !== undefined) {
		toastsError({
			msg: { text: get(i18n).tokens.error.already_available }
		});

		return { alreadyAvailable: true };
	}

	return { alreadyAvailable: false };
};

const loadMetadata = async ({
	identity,
	canisterId
}: IcPunksCanisters & { identity: Identity }): Promise<IcPunksTokenWithoutId | undefined> => {
	try {
		return mapIcPunksToken({
			canisterId,
			metadata: await collectionMetadata({ canisterId, identity, certified: true })
		});
	} catch (err: unknown) {
		toastsError({ msg: { text: get(i18n).tokens.import.error.loading_metadata } });

		throw err;
	}
};
