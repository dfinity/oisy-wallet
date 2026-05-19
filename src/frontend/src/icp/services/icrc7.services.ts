import { ICRC7_BUILTIN_TOKENS } from '$env/tokens/tokens-icrc7/tokens.icrc7.env';
import { icrc7DefaultTokensStore } from '$icp/stores/icrc7-default-tokens.store';
import type { ResultSuccess } from '$lib/types/utils';
import { parseTokenId } from '$lib/validation/token.validation';

// NOTE: PR 1 ships ICRC-7 frontend-only and intentionally does not load
// user-imported custom collections from the backend canister. Persistence of
// custom ICRC-7 imports is added in the follow-up PR that introduces an
// `Icrc7` variant in the backend's `Token` enum, which will also reintroduce
// the queryAndUpdate loadCustomTokens pipeline used by the other standards.

export const loadDefaultIcrc7Tokens = (): ResultSuccess => {
	icrc7DefaultTokensStore.set(
		ICRC7_BUILTIN_TOKENS.map((token) => ({ ...token, id: parseTokenId(token.symbol) }))
	);

	return { success: true };
};
