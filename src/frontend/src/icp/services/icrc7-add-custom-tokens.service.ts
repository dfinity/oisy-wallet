import { collectionMetadata } from '$icp/api/icrc7.api';
import type { Icrc7CanistersSchema } from '$icp/schema/icrc7-token.schema';
import type { Icrc7Token, Icrc7TokenWithoutId } from '$icp/types/icrc7-token';
import { mapIcrc7CollectionMetadata, mapIcrc7Token } from '$icp/utils/icrc7.utils';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { NullishIdentity } from '$lib/types/identity';
import { assertExistingTokens } from '$lib/utils/tokens.utils';
import { assertNonNullish, isNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';
import { get } from 'svelte/store';
import type * as z from 'zod';

type Icrc7Canisters = z.infer<typeof Icrc7CanistersSchema>;

export interface ValidateTokenData {
	token: Icrc7TokenWithoutId;
}

export const loadAndAssertAddCustomToken = async ({
	identity,
	icrc7Tokens,
	canisterId
}: Partial<Icrc7Canisters> & {
	identity: NullishIdentity;
	icrc7Tokens: Icrc7Token[];
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
		icrc7Tokens,
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

		const { valid } = assertExistingTokens({
			existingTokens: icrc7Tokens,
			token,
			errorMsg: get(i18n).tokens.error.duplicate_metadata
		});

		if (!valid) {
			return { result: 'error' };
		}

		return { result: 'success', data: { token } };
	} catch (_err: unknown) {
		return { result: 'error' };
	}
};

const assertAlreadyAvailable = ({
	icrc7Tokens,
	canisterId
}: {
	icrc7Tokens: Icrc7Token[];
} & Icrc7Canisters): { alreadyAvailable: boolean } => {
	if (icrc7Tokens?.find(({ canisterId: id }) => id === canisterId) !== undefined) {
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
}: Icrc7Canisters & { identity: Identity }): Promise<Icrc7TokenWithoutId | undefined> => {
	try {
		const entries = await collectionMetadata({ canisterId, identity, certified: true });

		const metadata = mapIcrc7CollectionMetadata(entries);

		if (isNullish(metadata)) {
			return undefined;
		}

		return mapIcrc7Token({
			canisterId,
			metadata: { name: metadata.name, symbol: metadata.symbol }
		});
	} catch (err: unknown) {
		toastsError({ msg: { text: get(i18n).tokens.import.error.loading_metadata } });

		throw err;
	}
};
