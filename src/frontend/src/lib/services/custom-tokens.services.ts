import type { CustomToken } from '$declarations/backend/backend.did';
import { listCustomTokens } from '$lib/api/backend.api';
import { getIdbAllCustomTokens, setIdbAllCustomTokens } from '$lib/api/idb-tokens.api';
import { nullishSignOut } from '$lib/services/auth.services';
import { i18n } from '$lib/stores/i18n.store';
import type { OptionIdentity } from '$lib/types/identity';
import { Principal } from '@dfinity/principal';
import { fromNullable, isNullish, nonNullish, toNullable } from '@dfinity/utils';
import { get } from 'svelte/store';

interface LoadCustomTokensFromBackendParams {
	identity: OptionIdentity;
	certified: boolean;
	filterTokens: (token: CustomToken) => boolean;
}

type LoadCustomTokensParams = LoadCustomTokensFromBackendParams & {
	useCache?: boolean;
};

const loadCustomTokensFromBackend = async ({
	identity,
	certified,
	filterTokens
}: LoadCustomTokensFromBackendParams): Promise<CustomToken[]> => {
	const tokens = await listCustomTokens({
		identity,
		certified,
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});

	// Caching the custom tokens in the IDB if update call
	if (certified && tokens.length > 0) {
		await setIdbAllCustomTokens({ identity, tokens });
	}

	// We filter the custom tokens, since the backend "Custom Token" potentially supports other types
	return tokens.filter(filterTokens);
};

export const loadNetworkCustomTokens = async ({
	identity,
	certified,
	filterTokens,
	useCache = false
}: LoadCustomTokensParams): Promise<CustomToken[]> => {
	if (isNullish(identity)) {
		await nullishSignOut();
		return [];
	}

	if (useCache && !certified) {
		const cachedTokens = await getIdbAllCustomTokens(identity.getPrincipal());

		if (nonNullish(cachedTokens)) {
			// Principals are saved as Uint8Array in the IDB, so we need to parse them back to Principal
			const parsePrincipal = (token: CustomToken): CustomToken => {
				if (!('Icrc' in token.token)) {
					return token;
				}

				const { ledger_id: rawLedgerId, index_id: rawIndexId } = token.token.Icrc;

				const ledgerId = Principal.from(rawLedgerId);
				const indexId = nonNullish(fromNullable(rawIndexId))
					? Principal.from(fromNullable(rawIndexId))
					: undefined;

				return {
					...token,
					token: {
						Icrc: {
							ledger_id: ledgerId,
							index_id: toNullable(indexId)
						}
					}
				};
			};

			return cachedTokens.map(parsePrincipal).filter(filterTokens);
		}
	}

	return await loadCustomTokensFromBackend({
		identity,
		certified,
		filterTokens
	});
};
