import { ICRC_CHAIN_FUSION_DEFAULT_LEDGER_CANISTER_IDS } from '$env/networks.icrc.env';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { CanisterIdText } from '$lib/types/canister';
import type { ExchangesData } from '$lib/types/exchange';
import type { Token, TokenStandard } from '$lib/types/token';
import type { TokenToggleable } from '$lib/types/token-toggleable';
import { usdValue } from '$lib/utils/exchange.utils';
import { nonNullish } from '@dfinity/utils';

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
	balance = 0n,
	fee = 0n,
	tokenDecimals,
	tokenStandard
}: {
	balance?: bigint;
	fee?: bigint;
	tokenDecimals: number;
	tokenStandard: TokenStandard;
}): number =>
	Math.max(Number(balance - (tokenStandard !== 'erc20' ? fee : 0n)), 0) / 10 ** tokenDecimals;

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
