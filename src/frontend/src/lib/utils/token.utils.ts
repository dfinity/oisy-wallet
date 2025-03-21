import {
	ICRC_CHAIN_FUSION_DEFAULT_LEDGER_CANISTER_IDS,
	ICRC_CHAIN_FUSION_SUGGESTED_LEDGER_CANISTER_IDS
} from '$env/networks/networks.icrc.env';
import { ERC20_SUGGESTED_TOKENS } from '$env/tokens/tokens.erc20.env';
import type { ContractAddressText } from '$eth/types/address';
import type { IcCkToken } from '$icp/types/ic-token';
import { isIcCkToken } from '$icp/validation/ic-token.validation';
import { ZERO, ZERO_BI } from '$lib/constants/app.constants';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { CanisterIdText } from '$lib/types/canister';
import type { ExchangesData } from '$lib/types/exchange';
import type { RequiredTokenWithLinkedData, Token, TokenStandard, TokenUi } from '$lib/types/token';
import type { TokenToggleable } from '$lib/types/token-toggleable';
import { mapCertifiedData } from '$lib/utils/certified-store.utils';
import { usdValue } from '$lib/utils/exchange.utils';
import { formatToken } from '$lib/utils/format.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
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
	const value = balance.sub(tokenStandard !== 'erc20' && tokenStandard !== 'spl' ? fee : ZERO_BI);

	return Number(
		value.isNegative()
			? ZERO
			: formatToken({
					value: value.toBigInt(),
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
}): TokenToggleable<T> => {
	const ledgerCanisterId =
		'ledgerCanisterId' in defaultToken &&
		(defaultToken as { ledgerCanisterId: CanisterIdText }).ledgerCanisterId;

	const isEnabledByDefault =
		ledgerCanisterId && ICRC_CHAIN_FUSION_DEFAULT_LEDGER_CANISTER_IDS.includes(ledgerCanisterId);

	const isSuggestedToken =
		(ledgerCanisterId &&
			ICRC_CHAIN_FUSION_SUGGESTED_LEDGER_CANISTER_IDS.includes(ledgerCanisterId)) ||
		('address' in defaultToken &&
			ERC20_SUGGESTED_TOKENS.map((token) => token.address).includes(
				(
					defaultToken as {
						address: ContractAddressText;
					}
				).address
			));

	return {
		...defaultToken,
		enabled:
			isEnabledByDefault ||
			(isNullish(userToken?.enabled) && isSuggestedToken) ||
			userToken?.enabled === true,
		version: userToken?.version
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

export const sumBalances = ([balance1, balance2]: [
	TokenUi['balance'],
	TokenUi['balance']
]): TokenUi['balance'] =>
	nonNullish(balance1) && nonNullish(balance2)
		? balance1 + balance2
		: balance1 === undefined || balance2 === undefined
			? undefined
			: (balance2 ?? balance1);

/** Function to sum the balances of two tokens.
 *
 * If the decimals of the tokens are the same, the balances are added together.
 * If the decimals are different, the function returns null.
 * If one of the balances is undefined (meaning that it is still not loaded), the function returns undefined, because we don't want to show a possible wrong balance.
 * If one of the balances is nullish, but not undefined, the function returns the other balance.
 * If both balances are nullish, the function prioritize the first token (that, by exclusion of cases, is null).
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
