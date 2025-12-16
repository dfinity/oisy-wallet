import type { ExtCanisters, ExtToken, ExtTokenWithoutId } from '$icp/types/ext-token';
import { mapExtToken } from '$icp/utils/ext.utils';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { OptionIdentity } from '$lib/types/identity';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { assertNonNullish, isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export interface ValidateTokenData {
	token: ExtTokenWithoutId;
}

export const loadAndAssertAddCustomToken = ({
	identity,
	extTokens,
	canisterId
}: Partial<ExtCanisters> & {
	identity: OptionIdentity;
	extTokens: ExtToken[];
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
		extTokens,
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

		const { valid } = assertExistingTokens({ token, extTokens });

		if (!valid) {
			return { result: 'error' };
		}

		return { result: 'success', data: { token } };
	} catch (_err: unknown) {
		return { result: 'error' };
	}
};

const assertExistingTokens = ({
	extTokens,
	token
}: {
	extTokens: ExtToken[];
	token: ExtTokenWithoutId;
}): { valid: boolean } => {
	if (
		extTokens.find(
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
	extTokens,
	canisterId
}: {
	extTokens: ExtToken[];
} & ExtCanisters): { alreadyAvailable: boolean } => {
	if (extTokens?.find(({ canisterId: id }) => id === canisterId) !== undefined) {
		toastsError({
			msg: { text: get(i18n).tokens.error.already_available }
		});

		return { alreadyAvailable: true };
	}

	return { alreadyAvailable: false };
};

const loadMetadata = ({ canisterId }: ExtCanisters): ExtTokenWithoutId | undefined => {
	try {
		return mapExtToken({
			canisterId,
			standard: 'ext',
			// We still don't have a way to get the token name from the canisterId, so we use the canisterId as the token name
			metadata: { name: shortenWithMiddleEllipsis({ text: canisterId }) }
		});
	} catch (err: unknown) {
		toastsError({ msg: { text: get(i18n).tokens.import.error.loading_metadata } });

		throw err;
	}
};
