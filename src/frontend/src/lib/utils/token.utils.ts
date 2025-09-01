import {
	ICRC_CHAIN_FUSION_DEFAULT_LEDGER_CANISTER_IDS,
	ICRC_CHAIN_FUSION_SUGGESTED_LEDGER_CANISTER_IDS
} from '$env/networks/networks.icrc.env';
import { ERC20_SUGGESTED_TOKENS } from '$env/tokens/tokens.erc20.env';
import { isTokenErc20 } from '$eth/utils/erc20.utils';
import type { IcCkToken } from '$icp/types/ic-token';
import { isIcCkToken } from '$icp/validation/ic-token.validation';
import { ZERO } from '$lib/constants/app.constants';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { OptionBalance } from '$lib/types/balance';
import type { CanisterIdText } from '$lib/types/canister';
import type { ExchangesData } from '$lib/types/exchange';
import type { RequiredTokenWithLinkedData, Token, TokenStandard, TokenUi } from '$lib/types/token';
import type { CardData } from '$lib/types/token-card';
import type { TokenToggleable } from '$lib/types/token-toggleable';
import { mapCertifiedData } from '$lib/utils/certified-store.utils';
import { usdValue } from '$lib/utils/exchange.utils';
import { formatToken } from '$lib/utils/format.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

/**
 * Calculates the maximum amount for a transaction.
 *
 * @param {Object} params
 * @param {bigint | undefined} params.balance The balance of the account.
 * @param {bigint | undefined} params.fee The fee of the transaction.
 * @param {number} params.tokenDecimals The decimals of the token.
 * @param {string} params.tokenStandard The standard of the token.
 * @returns {number} The maximum amount for the transaction.
 */
export const getMaxTransactionAmount = ({
	balance,
	fee = ZERO,
	tokenDecimals,
	tokenStandard
}: {
	balance: OptionBalance;
	fee?: bigint;
	tokenDecimals: number;
	tokenStandard: TokenStandard;
}): string => {
	const value =
		(balance ?? ZERO) - (tokenStandard !== 'erc20' && tokenStandard !== 'spl' ? fee : ZERO);

	return value <= ZERO
		? ZERO.toString()
		: formatToken({
				value,
				unitName: tokenDecimals,
				displayDecimals: tokenDecimals
			});
};

/**
 * /**
 *  * We always display the following tokens on the "Tokens" view:
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
	customToken
}: {
	defaultToken: T;
	customToken: TokenToggleable<T> | undefined;
}): TokenToggleable<T> => {
	const ledgerCanisterId =
		'ledgerCanisterId' in defaultToken &&
		(defaultToken as { ledgerCanisterId: CanisterIdText }).ledgerCanisterId;

	const isEnabledByDefault =
		ledgerCanisterId && ICRC_CHAIN_FUSION_DEFAULT_LEDGER_CANISTER_IDS.includes(ledgerCanisterId);

	const isSuggestedToken =
		(ledgerCanisterId &&
			ICRC_CHAIN_FUSION_SUGGESTED_LEDGER_CANISTER_IDS.includes(ledgerCanisterId)) ||
		(isTokenErc20(defaultToken) &&
			ERC20_SUGGESTED_TOKENS.map(({ id }) => id).includes(defaultToken.id));

	return {
		...defaultToken,
		enabled:
			isEnabledByDefault ||
			(isNullish(customToken?.enabled) && isSuggestedToken) ||
			customToken?.enabled === true,
		version: customToken?.version
	};
};

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
}): number | undefined =>
	calculateTokenUsdAmount({ amount: $balances?.[token.id]?.data, $exchanges, token });

/**
 * Calculates USD amount for the provided token and token amount.
 *
 * @param amount - Amount in token for which USD balance will be calculated.
 * @param token - Token for which USD balance will be calculated.
 * @param $exchanges - The exchange rates data for the tokens.
 * @returns The USD balance or Number(0) in case the number cannot be calculated.
 *
 */
export const calculateTokenUsdAmount = ({
	amount,
	token,
	$exchanges
}: {
	amount: bigint | undefined;
	token: Token;
	$exchanges: ExchangesData;
}): number | undefined => {
	const exchangeRate = $exchanges?.[token.id]?.usd;
	return nonNullish(exchangeRate)
		? usdValue({ decimals: token.decimals, balance: amount, exchangeRate })
		: undefined;
};

/** Maps a Token object to a TokenUi object, meaning it adds the balance and the USD balance to the token.
 *
 * @param token - The given token.
 * @param $balancesStore - The balances data for the tokens.
 * @param $exchanges - The exchange rates data for the tokens.
 * @returns The token UI.
 */
export const mapTokenUi = <T extends Token>({
	token,
	$balances,
	$exchanges
}: {
	token: T;
	$balances: CertifiedStoreData<BalancesData>;
	$exchanges: ExchangesData;
}): TokenUi<T> => ({
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

export const sumBalances = ([balance1, balance2]: TokenUi['balance'][]): TokenUi['balance'] =>
	nonNullish(balance1) && nonNullish(balance2)
		? balance1 + balance2
		: balance1 === undefined || balance2 === undefined
			? undefined
			: (balance2 ?? balance1);

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

/** Find in the provided tokens list a twin IC token by symbol.
 *
 * @param tokenToPair - token to find a twin for.
 * @param tokens - The list of tokens.
 * @returns IcCkToken or undefined if no twin token found.
 * */
export const findTwinToken = ({
	tokenToPair,
	tokens
}: {
	tokenToPair: Token;
	tokens: Token[];
}): IcCkToken | undefined =>
	isRequiredTokenWithLinkedData(tokenToPair)
		? (tokens.find(
				(token) => token.symbol === tokenToPair.twinTokenSymbol && isIcCkToken(token)
			) as IcCkToken | undefined)
		: undefined;

/**
 * Gets the symbol to display for the given token.
 *
 * @param token - for which the symbol to display should be found
 * @returns the symbol to display for the token
 */
export const getTokenDisplaySymbol = (token: Token | CardData): string =>
	token.oisySymbol?.oisySymbol ?? token.symbol;
