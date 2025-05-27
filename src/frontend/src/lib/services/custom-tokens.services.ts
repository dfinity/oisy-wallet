import type { CustomToken } from '$declarations/backend/backend.did';
import { listCustomTokens } from '$lib/api/backend.api';
import { i18n } from '$lib/stores/i18n.store';
import type { SetIdbTokensParams } from '$lib/types/idb-tokens';
import type { OptionIdentity } from '$lib/types/identity';
import { get } from 'svelte/store';

interface LoadCustomTokensParams {
	identity: OptionIdentity;
	certified: boolean;
	filterTokens: (token: CustomToken) => boolean;
	setIdbTokens: (params: SetIdbTokensParams) => Promise<void>;
}

const loadCustomTokensFromBackend = async ({
	identity,
	certified,
	filterTokens,
	setIdbTokens
}: LoadCustomTokensParams): Promise<CustomToken[]> => {
	const tokens = await listCustomTokens({
		identity,
		certified,
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});

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
	setIdbTokens
}: LoadCustomTokensParams): Promise<CustomToken[]> =>
	// TODO: load cached tokens from IDB if available
	await loadCustomTokensFromBackend({
		identity,
		certified,
		filterTokens,
		setIdbTokens
	});
