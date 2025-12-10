import type { CustomToken } from '$declarations/backend/backend.did';
import { listCustomTokens } from '$lib/api/backend.api';
import { getIdbAllCustomTokens, setIdbAllCustomTokens } from '$lib/api/idb-tokens.api';
import { i18n } from '$lib/stores/i18n.store';
import type { OptionIdentity } from '$lib/types/identity';
import { assertNever, fromNullable, isNullish, nonNullish, toNullable } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';
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
		return [];
	}

	if (useCache && !certified) {
		const cachedTokens = await getIdbAllCustomTokens(identity.getPrincipal());

		if (nonNullish(cachedTokens)) {
			// Principals are saved as Uint8Array in the IDB, so we need to parse them back to Principal
			const parsePrincipal = (token: CustomToken): CustomToken => {
				if ('Icrc' in token.token) {
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
				}

				if ('ExtV2' in token.token) {
					const { canister_id: rawCanisterId } = token.token.ExtV2;

					const canisterId = Principal.from(rawCanisterId);

					return {
						...token,
						token: {
							ExtV2: {
								canister_id: canisterId
							}
						}
					};
				}

				if (
					'Erc20' in token.token ||
					'Erc721' in token.token ||
					'Erc1155' in token.token ||
					'SplMainnet' in token.token ||
					'SplDevnet' in token.token
				) {
					return token;
				}

				assertNever(token.token, `Unexpected token type: ${token.token}`);
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
