import { ERC20_DEPRECATED_TOKENS } from '$env/tokens/tokens.erc20.env';
import { infuraErc20Providers } from '$eth/providers/infura-erc20.providers';
import type { OptionEthAddress } from '$eth/types/address';
import type { RequiredAdditionalErc20Token } from '$eth/types/erc20';
import { ZERO } from '$lib/constants/app.constants';
import { saveCustomTokens } from '$lib/services/save-custom-tokens.services';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { LoadCustomTokenParams } from '$lib/types/custom-token';
import type { Token } from '$lib/types/token';
import type { UserNetworks } from '$lib/types/user-networks';
import { areAddressesEqual } from '$lib/utils/address.utils';
import { isTokenToggleable } from '$lib/utils/token-toggleable.utils';
import { isTokenSuggested } from '$lib/utils/token.utils';
import { normalizeTokensForSave } from '$lib/utils/tokens.utils';
import { isUserNetworkEnabled } from '$lib/utils/user-networks.utils';
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

/**
 * Saves as enabled the deprecated ERC-20 tokens the user holds a balance in but has no entry for
 * in their token list, so a holder keeps such a token however long after it stopped being
 * suggested they come back. Only tokens on networks the user has switched on are checked.
 *
 * Only the certified token list is trusted to tell which entries are missing. A balance that
 * cannot be read counts as none: the next sign-in checks again.
 */
export const saveDeprecatedErc20TokensWithBalance = async ({
	identity,
	certified,
	tokens,
	address,
	userNetworks
}: LoadCustomTokenParams & {
	address: OptionEthAddress;
	userNetworks: UserNetworks;
}): Promise<void> => {
	if (!certified || isNullish(identity) || isNullish(tokens) || isNullish(address)) {
		return;
	}

	const unsavedTokens = ERC20_DEPRECATED_TOKENS.filter(
		({ address: contractAddress, network }) =>
			isUserNetworkEnabled({ userNetworks, networkId: network.id }) &&
			!tokens.some(
				({ token }) =>
					'Erc20' in token &&
					token.Erc20.chain_id === network.chainId &&
					areAddressesEqual({
						address1: token.Erc20.token_address,
						address2: contractAddress,
						networkId: network.id
					})
			)
	);

	const balances = await Promise.allSettled(
		unsavedTokens.map(async (token) => ({
			token,
			balance: await infuraErc20Providers(token.network.id).balance({ address, contract: token })
		}))
	);

	const tokensWithBalance = balances.reduce<RequiredAdditionalErc20Token[]>(
		(acc, result) =>
			result.status === 'fulfilled' && result.value.balance > ZERO
				? [...acc, result.value.token]
				: acc,
		[]
	);

	await saveSuggestedTokens({ identity, tokens: tokensWithBalance });
};
