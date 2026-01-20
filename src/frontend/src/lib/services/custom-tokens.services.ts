import type { CustomToken } from '$declarations/backend/backend.did';
import { listCustomTokens } from '$lib/api/backend.api';
import { getIdbAllCustomTokens, setIdbAllCustomTokens } from '$lib/api/idb-tokens.api';
import { i18n } from '$lib/stores/i18n.store';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import type { OptionIdentity } from '$lib/types/identity';
import {
	assertNever,
	debounce,
	fromNullable,
	isNullish,
	nonNullish,
	toNullable,
	type QueryParams
} from '@dfinity/utils';
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

type DebounceWindowKey = 'update' | 'query';

interface DebounceWindow {
	pending: Array<{
		resolve: (value: CustomToken[]) => void;
		reject: (reason?: unknown) => void;
	}>;
	latestParams?: CanisterApiFunctionParams<QueryParams>;
}

const windows: Record<DebounceWindowKey, DebounceWindow> = {
	update: { pending: [] },
	query: { pending: [] }
};

const debouncedQueryListCustomTokens = debounce(async () => {
	const window = windows.query;

	const { pending, latestParams } = window;

	const toFlush = pending.splice(0, pending.length);
	const params = latestParams;

	window.latestParams = undefined;

	// nothing to do: flush waiters with empty to avoid hanging
	if (isNullish(params)) {
		// should not happen, but avoid hanging tests
		toFlush.forEach(({ resolve }) => resolve([]));

		return;
	}

	try {
		const tokens = await listCustomTokens(params);

		toFlush.forEach(({ resolve }) => resolve(tokens));
	} catch (error: unknown) {
		toFlush.forEach(({ reject }) => reject(error));
	}
});

const debouncedUpdateListCustomTokens = debounce(async () => {
	const window = windows.update;

	const { pending, latestParams } = window;

	const toFlush = pending.splice(0, pending.length);

	const params = latestParams;

	// start a new window state regardless of outcome
	window.latestParams = undefined;

	// nothing to do: flush waiters with empty to avoid hanging
	if (isNullish(params)) {
		// should not happen, but avoid hanging tests
		toFlush.forEach(({ resolve }) => resolve([]));

		return;
	}

	try {
		const tokens = await listCustomTokens(params);

		toFlush.forEach(({ resolve }) => resolve(tokens));
	} catch (error: unknown) {
		toFlush.forEach(({ reject }) => reject(error));
	}
});

const debouncedByWindow: Record<DebounceWindowKey, () => void> = {
	query: debouncedQueryListCustomTokens,
	update: debouncedUpdateListCustomTokens
};

export const debounceListCustomTokens = (
	params: CanisterApiFunctionParams<QueryParams>
): Promise<CustomToken[]> =>
	new Promise<CustomToken[]>((resolve, reject) => {
		const key: DebounceWindowKey = params.certified ? 'update' : 'query';

		const window = windows[key];

		window.pending.push({ resolve, reject });
		window.latestParams = params;

		debouncedByWindow[key]();
	});

const loadCustomTokensFromBackend = async ({
	identity,
	certified,
	filterTokens
}: LoadCustomTokensFromBackendParams): Promise<CustomToken[]> => {
	const tokens = await debounceListCustomTokens({
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

				return filterTokens(parsed) ? [...acc, parsed] : acc;
			}, []);
		}
	}

	return await loadCustomTokensFromBackend({
		identity,
		certified,
		filterTokens
	});
};
