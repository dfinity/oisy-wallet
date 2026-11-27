import { loadCustomTokens as loadCustomErc20Tokens } from '$eth/services/erc20.services';
import { loadCustomTokens as loadCustomIcrcTokens } from '$icp/services/icrc.services';
import { setCustomToken } from '$lib/api/backend.api';
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
 * Saves each token as enabled to the user's token list, so a suggested token stays enabled for
 * the user once it is no longer suggested. Every token is saved in a call of its own, and only the
 * standards of the tokens that were saved have their custom tokens reloaded, so they carry the
 * version the backend gave the new entries.
 *
 * A save carries no version, so the backend refuses it for a token that already has an entry: the
 * user's own choice always wins, and with a call per token, a refused token does not hold back the
 * others. A failed save is not reported: the next session tries again.
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

		const results = await Promise.allSettled(
			tokensToSave.map(async (token) => {
				await setCustomToken({ identity, token: toCustomToken(token) });

				return token;
			})
		);

		const loaders = new Set(
			results
				.filter((result) => result.status === 'fulfilled')
				.map(({ value: { networkKey } }) => loadCustomTokensByNetworkKey[networkKey])
		);

		await Promise.all([...loaders].filter(nonNullish).map((load) => load({ identity })));
	} catch (_: unknown) {
		// Saving is a good-to-have extra: the token is enabled either way while it is suggested.
	}
};
