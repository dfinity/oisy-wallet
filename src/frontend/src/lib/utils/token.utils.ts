import { ICRC_CHAIN_FUSION_DEFAULT_LEDGER_CANISTER_IDS } from '$env/networks.icrc.env';
import type { IcCkToken } from '$icp/types/ic';
import { isIcCkToken } from '$icp/utils/icrc.utils';
import { ZERO } from '$lib/constants/app.constants';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { CanisterIdText } from '$lib/types/canister';
import type { ExchangesData } from '$lib/types/exchange';
import type {
	RequiredTokenWithLinkedData,
	Token,
	TokenStandard,
	TokenUi,
	TokenUiGroup,
	TokenUiOrGroupUi
} from '$lib/types/token';
import type { TokenToggleable } from '$lib/types/token-toggleable';
import { mapCertifiedData } from '$lib/utils/certified-store.utils';
import { usdValue } from '$lib/utils/exchange.utils';
import { formatToken } from '$lib/utils/format.utils';
import { nonNullish } from '@dfinity/utils';
import type { BigNumber } from '@ethersproject/bignumber';

/**
 * Calculates the maximum amount for a transaction.
 *
 * @param {Object} params
 * @param {BigNumber | undefined} params.balance The balance of the account.
 * @param {BigNumber | undefined} params.fee The fee of the transaction.
 * @param {number} params.tokenDecimals The decimals of the token.
 * @param {string} params.tokenStandard The standard of the token.
 * @returns {number} The maximum amount for the transaction.
 */
export const getMaxTransactionAmount = ({
	balance = ZERO,
	fee = ZERO,
	tokenDecimals,
	tokenStandard
}: {
	balance?: BigNumber;
	fee?: BigNumber;
	tokenDecimals: number;
	tokenStandard: TokenStandard;
}): number => {
	const value = balance.sub(tokenStandard !== 'erc20' ? fee : 0n);

	return Number(
		value.isNegative()
			? ZERO
			: formatToken({
					value,
					unitName: tokenDecimals,
					displayDecimals: tokenDecimals
				})
	);
};

/**
 * /**
 *  * We always display following tokens on the "Tokens" view:
 *  * - ICP token
 *  * - Ethereum token
 *  * - A subset of cK tokens
 *
 * In addition to those, we display also:
 * - The tokens that have been enabled by the user
 *
 * That is why the `enabled` flag is either enabled for a subset of ledgerCanisterIds or if user has set an enabled custom token in the backend.
 */
export const mapDefaultTokenToToggleable = <T extends Token>({
	defaultToken,
	userToken
}: {
	defaultToken: T;
	userToken: TokenToggleable<T> | undefined;
}): TokenToggleable<T> => ({
	...defaultToken,
	enabled:
		('ledgerCanisterId' in defaultToken &&
			ICRC_CHAIN_FUSION_DEFAULT_LEDGER_CANISTER_IDS.includes(
				(defaultToken as { ledgerCanisterId: CanisterIdText }).ledgerCanisterId
			)) ||
		userToken?.enabled === true,
	version: userToken?.version
});

/**
 * Calculates USD balance for the provided token.
 *
 * @param token - Token for which USD balance will be calculated.
 * @param $balancesStore - The balances data for the tokens.
 * @param $exchanges - The exchange rates data for the tokens.
 * @returns The USD balance or undefined in case the number cannot be calculated.
 *
 */
export const calculateTokenUsdBalance = ({
	token,
	$balances,
	$exchanges
}: {
	token: Token;
	$balances: CertifiedStoreData<BalancesData>;
	$exchanges: ExchangesData;
}): number | undefined => {
	const exchangeRate: number | undefined = $exchanges?.[token.id]?.usd;

	return nonNullish(exchangeRate)
		? usdValue({
				token,
				balance: $balances?.[token.id]?.data,
				exchangeRate
			})
		: undefined;
};

/** Maps a Token object to a TokenUi object, meaning it adds the balance and the USD balance to the token.
 *
 * @param token - The given token.
 * @param $balancesStore - The balances data for the tokens.
 * @param $exchanges - The exchange rates data for the tokens.
 * @returns The token UI.
 */
export const mapTokenUi = ({
	token,
	$balances,
	$exchanges
}: {
	token: Token;
	$balances: CertifiedStoreData<BalancesData>;
	$exchanges: ExchangesData;
}): TokenUi => ({
	...token,
	// There is a difference between undefined and null for the balance.
	// The balance is undefined if the balance store is not initiated or the specific balance loader for the token is not initiated.
	// If the balance loader was initiated at some point, it will either contain data or be null, but not undefined.
	balance: mapCertifiedData($balances?.[token.id]),
	usdBalance: calculateTokenUsdBalance({
		token,
		$balances,
		$exchanges
	})
});

const sumBalances = ([balance1, balance2]: [
	TokenUi['balance'],
	TokenUi['balance']
]): TokenUi['balance'] =>
	nonNullish(balance1) && nonNullish(balance2) ? balance1.add(balance2) : (balance2 ?? balance1);

/** Function to sum the balances of two tokens.
 *
 * If the decimals of the tokens are the same, the balances are added together.
 * If the decimals are different, the function returns null.
 * If one of the balances is nullish, the function returns the other balance.
 * If both balances are nullish, the function prioritize the first token
 * NOTE: the function assumes that the two tokens are always 1:1 twins, for example BTC and ckBTC, or ETH and SepoliaETH
 *
 * @param token1
 * @param token2
 * @returns The sum of the balances or nullish value.
 */
export const sumTokenBalances = ([token1, token2]: [TokenUi, TokenUi]): TokenUi['balance'] =>
	token1.decimals === token2.decimals ? sumBalances([token1.balance, token2.balance]) : null;

/** Function to sum the USD balances of two tokens.
 *
 * If one of the balances is nullish, the function returns the other balance.
 *
 * @param usdBalance1
 * @param usdBalance2
 * @returns The sum of the USD balances or nullish value.
 */
export const sumUsdBalances = ([usdBalance1, usdBalance2]: [
	TokenUi['usdBalance'],
	TokenUi['usdBalance']
]): TokenUi['usdBalance'] =>
	nonNullish(usdBalance1) || nonNullish(usdBalance2)
		? (usdBalance1 ?? 0) + (usdBalance2 ?? 0)
		: undefined;

/**
 * Type guard to check if a token is of type RequiredTokenWithLinkedData.
 * This checks whether the token has a twinTokenSymbol field and ensures that it is a string.
 *
 * @param token - The token object to be checked.
 * @returns A boolean indicating whether the token is of type RequiredTokenWithLinkedData.
 */
export const isRequiredTokenWithLinkedData = (token: Token): token is RequiredTokenWithLinkedData =>
	'twinTokenSymbol' in token && typeof token.twinTokenSymbol === 'string';

/**
 * Type guard to check if an object is of type TokenUiGroup.
 *
 * @param tokenUiOrGroupUi - The object to check.
 * @returns A boolean indicating whether the object is a TokenUiGroup.
 */
export const isTokenUiGroup = (
	tokenUiOrGroupUi: TokenUiOrGroupUi
): tokenUiOrGroupUi is TokenUiGroup =>
	typeof tokenUiOrGroupUi === 'object' &&
	'nativeToken' in tokenUiOrGroupUi &&
	'tokens' in tokenUiOrGroupUi;

/**
 * Factory function to create a TokenUiGroup based on the provided tokens and network details.
 * This function creates a group header and adds both the native token and the twin token to the group's tokens array.
 *
 * @param nativeToken - The native token used for the group, typically the original token or the one from the selected network.
 * @param twinToken - The twin token to be grouped with the native token, usually representing the same asset on a different network.
 *
 * @returns A TokenUiGroup object that includes a header with network and symbol information and contains both the native and twin tokens.
 */
const createTokenGroup = ({
	nativeToken,
	twinToken
}: {
	nativeToken: TokenUi;
	twinToken: TokenUi;
}): TokenUiGroup => ({
	id: Symbol(`GRP-${nativeToken.symbol}`),
	nativeToken,
	tokens: [nativeToken, twinToken],
	balance: sumTokenBalances([nativeToken, twinToken]),
	usdBalance: sumUsdBalances([nativeToken.usdBalance, twinToken.usdBalance])
});

/**
 * Function to create a list of TokenUiOrGroupUi by grouping tokens with matching twinTokenSymbol.
 * The group is placed in the position where the first token of the group was found.
 * Tokens with no twin remain as individual tokens in their original position.
 *
 * @param tokens - The list of TokenUi objects to group. Each token may or may not have a twinTokenSymbol.
 *                 Tokens with a twinTokenSymbol are grouped together.
 *
 * @returns A new list where tokens with twinTokenSymbols are grouped into a TokenUiGroup,
 *          and tokens without twins remain in their original place.
 *          The group replaces the first token of the group in the list.
 */
export const groupTokensByTwin = (tokens: TokenUi[]): TokenUiOrGroupUi[] => {
	const groupedTokenTwins = new Set<string>();
	const mappedTokensWithGroups: TokenUiOrGroupUi[] = tokens.map((token) => {
		if (!isRequiredTokenWithLinkedData(token)) {
			return token;
		}

		const twinToken = tokens.find((t) => t.symbol === token.twinTokenSymbol && isIcCkToken(t)) as
			| IcCkToken
			| undefined;

		if (twinToken && twinToken.decimals === token.decimals) {
			groupedTokenTwins.add(twinToken.symbol);
			groupedTokenTwins.add(token.symbol);
			return createTokenGroup({
				nativeToken: token,
				twinToken: twinToken
			});
		}

		return token;
	});

	return mappedTokensWithGroups.filter(
		(t) => isTokenUiGroup(t) || !groupedTokenTwins.has(t.symbol)
	);
};
