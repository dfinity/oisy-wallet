import { icrc7CustomTokensStore } from '$icp/stores/icrc7-custom-tokens.store';
import type { Icrc7CustomToken } from '$icp/types/icrc7-custom-token';
import type { Icrc7TokenWithoutId } from '$icp/types/icrc7-token';
import { parseTokenId } from '$lib/validation/token.validation';

// NOTE: PR 1 ships ICRC-7 frontend-only. This service writes user-imported
// ICRC-7 collections to the in-memory custom-tokens store. The follow-up PR
// adds an `Icrc7` variant to the backend `Token` enum and replaces this with
// a `saveCustomTokensWithKey({ networkKey: 'Icrc7', ... })` call so imports
// persist across sessions.

export const saveIcrc7CustomTokenInMemory = ({
	token,
	enabled = true
}: {
	token: Icrc7TokenWithoutId;
	enabled?: boolean;
}): void => {
	const customToken: Icrc7CustomToken = {
		...token,
		id: parseTokenId(token.symbol),
		enabled
	};

	icrc7CustomTokensStore.setAll([{ data: customToken, certified: true }]);
};
