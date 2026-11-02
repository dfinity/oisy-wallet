import { ZERO } from '$lib/constants/app.constants';
import { saveCustomTokens } from '$lib/services/save-custom-tokens.services';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { Token } from '$lib/types/token';
import { isTokenToggleable } from '$lib/utils/token-toggleable.utils';
import { isTokenSuggested } from '$lib/utils/token.utils';
import { normalizeTokensForSave } from '$lib/utils/tokens.utils';
import { isNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';

/**
 * The suggested tokens the user holds a balance in but has no entry for in their token list.
 * Every entry carries the version the backend gave it, so a token without one has no entry.
 */
export const findSuggestedTokensWithBalance = ({
	tokens,
	balances
}: {
	tokens: Token[];
	balances: CertifiedStoreData<BalancesData>;
}): Token[] =>
	tokens.filter(
		(token) =>
			isTokenToggleable(token) &&
			isNullish(token.version) &&
			isTokenSuggested(token) &&
			(balances?.[token.id]?.data ?? ZERO) > ZERO
	);

/**
 * Saves the tokens as enabled to the user's token list, so a suggested token stays enabled for
 * the user once it is no longer suggested.
 *
 * The save carries no version, so the backend refuses it for a token that has gained an entry in
 * the meantime: the user's own choice always wins. A failed save is not reported: the next
 * session tries again.
 */
export const saveSuggestedTokens = async ({
	identity,
	tokens
}: {
	identity: Identity;
	tokens: Token[];
}): Promise<void> => {
	try {
		const [first, ...rest] = normalizeTokensForSave(
			tokens.map((token) => ({ ...token, enabled: true }))
		);

		if (isNullish(first)) {
			return;
		}

		await saveCustomTokens({ identity, tokens: [first, ...rest] });
	} catch (_: unknown) {
		// Saving is a good-to-have extra: the token is enabled either way while it is suggested.
	}
};
