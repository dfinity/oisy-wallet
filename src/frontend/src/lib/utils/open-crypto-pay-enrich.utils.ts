import { ZERO } from '$lib/constants/app.constants';
import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { ExchangesData } from '$lib/types/exchange';
import type {
	PayableTokenWithConvertedAmount,
	PayableTokenWithFees
} from '$lib/types/open-crypto-pay';
import { formatToken } from '$lib/utils/format.utils';
import { parseToken } from '$lib/utils/parse.utils';
import { isNullish } from '@dfinity/utils';

/**
 * Enriches a single-token payable token (fee paid in the same token, single
 * exchange rate) with USD values, after validating sufficient balance.
 *
 * Shared by Bitcoin and ICP/ICRC, which only differ in how the fee amount is
 * derived from the chain-specific `token.fee`. Chains where the fee is paid in
 * a distinct native token and priced separately (ETH/EVM) are not covered here.
 *
 * This lives in a leaf module that imports nothing chain-specific, so the
 * chain-specific utils can depend on it without forming an import cycle with
 * the open-crypto-pay router.
 *
 * @param token - Token with fee data to enrich
 * @param exchanges - Exchange rates for price lookup
 * @param balances - User token balances
 * @param getFee - Resolves the fee amount (in the token's smallest unit) from
 *   the chain-specific fee, or `undefined` when the fee is missing or invalid
 */
export const enrichSingleTokenPayableToken = ({
	token,
	exchanges,
	balances,
	getFee
}: {
	token: PayableTokenWithFees;
	exchanges: ExchangesData | undefined;
	balances: CertifiedStoreData<BalancesData>;
	getFee: (fee: PayableTokenWithFees['fee']) => bigint | undefined;
}): PayableTokenWithConvertedAmount | undefined => {
	const { id: tokenId, fee, amount, decimals } = token;

	const feeAmount = getFee(fee);

	if (isNullish(feeAmount)) {
		return;
	}

	const exchangeRate = exchanges?.[tokenId]?.usd;
	const balance = balances?.[tokenId]?.data ?? ZERO;

	if (isNullish(exchangeRate)) {
		return;
	}

	const amountToPay = parseToken({
		value: amount,
		unitName: decimals
	});

	if (balance < amountToPay + feeAmount) {
		return;
	}

	const formattedFee = Number(
		formatToken({
			value: feeAmount,
			unitName: decimals,
			displayDecimals: decimals
		})
	);

	const amountInUSD = Number(amount) * exchangeRate;
	const feeInUSD = formattedFee * exchangeRate;

	return {
		...token,
		amountInUSD,
		feeInUSD,
		sumInUSD: amountInUSD + feeInUSD
	};
};
