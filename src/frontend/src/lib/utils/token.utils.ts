import { ICRC_CHAIN_FUSION_DEFAULT_LEDGER_CANISTER_IDS } from '$env/networks.icrc.env';
import { ZERO } from '$lib/constants/app.constants';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { CanisterIdText } from '$lib/types/canister';
import type { Token, TokenStandard, TokenUi } from '$lib/types/token';
import type { TokenToggleable } from '$lib/types/token-toggleable';
import { mapCertifiedData } from '$lib/utils/certified-store.utils';
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

/** Maps a Token object to a TokenUi object, meaning it adds the balance to the token.
 *
 * @param token - The given token.
 * @param $balancesStore - The balances data for the tokens.
 * @returns The token UI.
 */
export const mapTokenUi = ({
	token,
	$balances
}: {
	token: Token;
	$balances: CertifiedStoreData<BalancesData>;
}): TokenUi => {
	const balance = mapCertifiedData($balances?.[token.id]);

	return {
		...token,
		// There is a difference between undefined and null for the balance.
		// The balance is undefined if the balance store is not initiated or the specific balance loader for the token is not initiated.
		// If the balance loader was initiated at some point, it will either contain data or be null, but not undefined.
		balance,
		formattedBalance: nonNullish(balance)
			? formatToken({
					value: balance,
					unitName: token.decimals,
					displayDecimals: token.decimals
				})
			: balance
	};
};
