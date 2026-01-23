import type { CustomToken } from '$declarations/backend/backend.did';
import { listCustomTokens } from '$lib/api/backend.api';
import { getIdbAllCustomTokens, setIdbAllCustomTokens } from '$lib/api/idb-tokens.api';
import { backendCustomTokens } from '$lib/stores/backend-custom-tokens.store';
import { i18n } from '$lib/stores/i18n.store';
import type { OptionIdentity } from '$lib/types/identity';
import { assertNever, fromNullable, isNullish, nonNullish, queryAndUpdate, toNullable } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';
import { get } from 'svelte/store';

interface LoadCustomTokensFromBackendParams {
	identity: OptionIdentity;
	certified: boolean;
	filterTokens?: (token: CustomToken) => boolean;
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

	backendCustomTokens.set(tokens);

	// Caching the custom tokens in the IDB if update call
	if (certified && tokens.length > 0) {
		await setIdbAllCustomTokens({ identity, tokens });
	}

	if (isNullish(filterTokens)) {
		return tokens;
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

				if ('Dip721' in token.token) {
					const { canister_id: rawCanisterId } = token.token.Dip721;

					const canisterId = Principal.from(rawCanisterId);

					return {
						...token,
						token: {
							Dip721: {
								canister_id: canisterId
							}
						}
					};
				}

				if ('IcPunks' in token.token) {
					const { canister_id: rawCanisterId } = token.token.IcPunks;

					const canisterId = Principal.from(rawCanisterId);

					return {
						...token,
						token: {
							IcPunks: {
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

			return cachedTokens.reduce<CustomToken[]>((acc, token) => {
				const parsed = parsePrincipal(token);

				return isNullish(filterTokens) || filterTokens(parsed) ? [...acc, parsed] : acc;
			}, []);
		}
	}

	return await loadCustomTokensFromBackend({
		identity,
		certified,
		filterTokens
	});
};

export const loadCustomTokens = async ({
	identity,
	...rest
}: {
	identity: OptionIdentity;
} & Omit<LoadCustomTokensParams, 'identity' | 'filterTokens' | 'certified'>): Promise<void> => {
	if (isNullish(identity)) {
		return;
	}

	await queryAndUpdate<CustomToken[]>({
		request: ({ certified }) =>
			loadNetworkCustomTokens({
				identity,
				certified,
				...rest
			}),
		onLoad: async ({ response: tokens, certified }) => {
			const { loadCustomTokens: loadIcrcCustomTokens } = await import(
				'../../icp/services/icrc.services'
			);
			const { loadCustomTokens: loadErc20CustomTokens } = await import(
				'../../eth/services/erc20.services'
			);
			const { loadCustomTokens: loadErc721CustomTokens } = await import(
				'../../eth/services/erc721.services'
			);
			const { loadCustomTokens: loadErc1155CustomTokens } = await import(
				'../../eth/services/erc1155.services'
			);
			const { loadCustomTokens: loadSplCustomTokens } = await import(
				'../../sol/services/spl.services'
			);
			const { loadCustomTokens: loadExtCustomTokens } = await import(
				'../../icp/services/ext.services'
			);
			const { loadCustomTokens: loadIcPunksCustomTokens } = await import(
				'../../icp/services/icpunks.services'
			);

			const icrcTokens: CustomToken[] = [];
			const erc20Tokens: CustomToken[] = [];
			const erc721Tokens: CustomToken[] = [];
			const erc1155Tokens: CustomToken[] = [];
			const splTokens: CustomToken[] = [];
			const extTokens: CustomToken[] = [];
			const icPunksTokens: CustomToken[] = [];

			tokens.forEach((token) => {
				if ('Icrc' in token.token) {
					icrcTokens.push(token);
				} else if ('Erc20' in token.token) {
					erc20Tokens.push(token);
				} else if ('Erc721' in token.token) {
					erc721Tokens.push(token);
				} else if ('Erc1155' in token.token) {
					erc1155Tokens.push(token);
				} else if ('SplMainnet' in token.token || 'SplDevnet' in token.token) {
					splTokens.push(token);
				} else if ('ExtV2' in token.token) {
					extTokens.push(token);
				} else if ('IcPunks' in token.token) {
					icPunksTokens.push(token);
				}
			});

			await Promise.all([
				loadIcrcCustomTokens({ identity, certified, tokens: icrcTokens }),
				loadErc20CustomTokens({ identity, certified, tokens: erc20Tokens }),
				loadErc721CustomTokens({ identity, certified, tokens: erc721Tokens }),
				loadErc1155CustomTokens({ identity, certified, tokens: erc1155Tokens }),
				loadSplCustomTokens({ identity, certified, tokens: splTokens }),
				loadExtCustomTokens({ identity, certified, tokens: extTokens }),
				loadIcPunksCustomTokens({ identity, certified, tokens: icPunksTokens })
			]);
		},
		onUpdateError: () => {
			// Errors are handled standard by standard
		},
		identity
	});
};
