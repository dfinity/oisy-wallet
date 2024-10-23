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
	TokenGroupUi,
	TokenStandard,
	TokenUi,
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
 * Type guard to check if an object is of type TokenGroupUi.
 *
 * @param tokenUiOrGroupUi - The object to check.
 * @returns A boolean indicating whether the object is a TokenGroupUi.
 */
export const isTokenGroupUi = (
	tokenUiOrGroupUi: TokenUiOrGroupUi
): tokenUiOrGroupUi is TokenGroupUi =>
	typeof tokenUiOrGroupUi === 'object' &&
	nonNullish(tokenUiOrGroupUi) &&
	'header' in tokenUiOrGroupUi &&
	typeof tokenUiOrGroupUi.header === 'object' &&
	'tokens' in tokenUiOrGroupUi;

/**
 * Factory function to create a TokenGroupUi based on the provided tokens and network details.
 * This function creates a group header and adds both the native token and the twin token to the group's tokens array.
 *
 * @param nativeToken - The native token used for the group, typically the original token or the one from the selected network.
 * @param twinToken - The twin token to be grouped with the native token, usually representing the same asset on a different network.
 *
 * @returns A TokenGroupUi object that includes a header with network and symbol information and contains both the native and twin tokens.
 */
const createTokenGroup = ({
	nativeToken,
	twinToken
}: {
	nativeToken: TokenUi;
	twinToken: TokenUi;
}): TokenGroupUi => ({
	header: {
		name: nativeToken.network.name,
		symbol: `${nativeToken.symbol}, ${twinToken.symbol}`,
		decimals: nativeToken.decimals,
		icon: nativeToken.icon
	},
	nativeToken,
	nativeNetwork: nativeToken.network,
	tokens: [nativeToken, twinToken]
});

/**
 * Function to create a list of TokenUiOrGroupUi by grouping tokens with matching twinTokenSymbol.
 * The group is placed in the position where the first token of the group was found.
 * Tokens with no twin remain as individual tokens in their original position.
 *
 * @param tokens - The list of TokenUi objects to group. Each token may or may not have a twinTokenSymbol.
 *                 Tokens with a twinTokenSymbol are grouped together.
 *
 * @returns A new list where tokens with twinTokenSymbols are grouped into a TokenGroupUi,
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
		(t) => isTokenGroupUi(t) || !groupedTokenTwins.has(t.symbol)
	);
};
