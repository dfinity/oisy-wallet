import type { CustomToken } from '$declarations/backend/backend.did';
import { listCustomTokens } from '$lib/api/backend.api';
import { nullishSignOut } from '$lib/services/auth.services';
import { i18n } from '$lib/stores/i18n.store';
import type { SetIdbTokensParams } from '$lib/types/idb-tokens';
import type { OptionIdentity } from '$lib/types/identity';
import { Principal } from '@dfinity/principal';
import { fromNullable, isNullish, nonNullish, toNullable } from '@dfinity/utils';
import { get } from 'svelte/store';

interface LoadCustomTokensFromBackendParams {
	identity: OptionIdentity;
	certified: boolean;
	filterTokens: (token: CustomToken) => boolean;
	setIdbTokens: (params: SetIdbTokensParams<CustomToken>) => Promise<void>;
}

type LoadCustomTokensParams = LoadCustomTokensFromBackendParams & {
	getIdbTokens: (principal: Principal) => Promise<CustomToken[] | undefined>;
	useCache?: boolean;
};

const loadCustomTokensFromBackend = async ({
	identity,
	certified,
	filterTokens,
	setIdbTokens
}: LoadCustomTokensFromBackendParams): Promise<CustomToken[]> => {
	const tokens = await listCustomTokens({
		identity,
		certified,
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});

	console.log("Custom contracts")
	console.log(tokens)

	// We filter the custom tokens, since the backend "Custom Token" potentially supports other types
	const filteredTokens = tokens.filter(filterTokens);

	// Caching the custom tokens in the IDB if update call
	if (certified && filteredTokens.length > 0) {
		await setIdbTokens({ identity, tokens: filteredTokens });
	}

	return filteredTokens;
};

export const loadNetworkCustomTokens = async ({
	identity,
	certified,
	filterTokens,
	setIdbTokens,
	getIdbTokens,
	useCache = false
}: LoadCustomTokensParams): Promise<CustomToken[]> => {
	if (isNullish(identity)) {
		await nullishSignOut();
		return [];
	}

	if (useCache && !certified) {
		const cachedTokens = await getIdbTokens(identity.getPrincipal());

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

			return cachedTokens.map(parsePrincipal);
		}
	}

	return await loadCustomTokensFromBackend({
		identity,
		certified,
		filterTokens,
		setIdbTokens
	});
};
