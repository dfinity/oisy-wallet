import { loadCustomTokens as loadCustomErc20Tokens } from '$eth/services/erc20.services';
import { loadCustomTokens as loadCustomIcrcTokens } from '$icp/services/icrc.services';
import { setManyCustomTokens } from '$lib/api/backend.api';
import { ZERO } from '$lib/constants/app.constants';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { SaveCustomTokenWithKey } from '$lib/types/custom-token';
import type { Token } from '$lib/types/token';
import { toCustomToken } from '$lib/utils/custom-token.utils';
import { isTokenToggleable } from '$lib/utils/token-toggleable.utils';
import { isTokenSuggested } from '$lib/utils/token.utils';
import { normalizeTokensForSave } from '$lib/utils/tokens.utils';
import { loadCustomTokens as loadCustomSplTokens } from '$sol/services/spl.services';
import { isNullish, nonNullish } from '@dfinity/utils';
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

// The custom tokens to reload after a save, for each standard a suggested token can have.
const loadCustomTokensByNetworkKey: Partial<
	Record<SaveCustomTokenWithKey['networkKey'], (params: { identity: Identity }) => Promise<void>>
> = {
	Icrc: loadCustomIcrcTokens,
	Erc20: loadCustomErc20Tokens,
	SplMainnet: loadCustomSplTokens,
	SplDevnet: loadCustomSplTokens
};

/**
 * Saves the tokens as enabled to the user's token list, so a suggested token stays enabled for
 * the user once it is no longer suggested. Only after a successful save, and only for the
 * standards of the saved tokens, are the custom tokens reloaded, so they carry the version the
 * backend gave the new entries.
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
		const tokensToSave = normalizeTokensForSave(
			tokens.map((token) => ({ ...token, enabled: true }))
		);

		if (tokensToSave.length === 0) {
			return;
		}

		await setManyCustomTokens({ identity, tokens: tokensToSave.map(toCustomToken) });

		const loaders = new Set(
			tokensToSave.map(({ networkKey }) => loadCustomTokensByNetworkKey[networkKey])
		);

		await Promise.all([...loaders].filter(nonNullish).map((load) => load({ identity })));
	} catch (_: unknown) {
		// Saving is a good-to-have extra: the token is enabled either way while it is suggested.
	}
};
