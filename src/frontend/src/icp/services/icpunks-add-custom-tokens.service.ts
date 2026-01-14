import type {
	IcPunksCanisters,
	IcPunksToken,
	IcPunksTokenWithoutId
} from '$icp/types/icpunks-token';
import { mapIcPunksToken } from '$icp/utils/icpunks.utils';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { OptionIdentity } from '$lib/types/identity';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { assertNonNullish, isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export interface ValidateTokenData {
	token: IcPunksTokenWithoutId;
}

export const loadAndAssertAddCustomToken = ({
	identity,
	icPunksTokens,
	canisterId
}: Partial<IcPunksCanisters> & {
	identity: OptionIdentity;
	icPunksTokens: IcPunksToken[];
}): {
	result: 'success' | 'error';
	data?: ValidateTokenData;
} => {
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

		const token = loadMetadata(params);

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

const loadMetadata = ({ canisterId }: IcPunksCanisters): IcPunksTokenWithoutId | undefined => {
	try {
		return mapIcPunksToken({
			canisterId,
			// We still don't have a way to get the token name from the canisterId, so we use the canisterId as the token name
			metadata: { name: shortenWithMiddleEllipsis({ text: canisterId }) }
		});
	} catch (err: unknown) {
		toastsError({ msg: { text: get(i18n).tokens.import.error.loading_metadata } });

		throw err;
	}
};
