import { BTC_DECIMALS } from '$env/tokens/tokens.btc.env';
import type { Amount } from '$lib/types/send';

export const convertNumberToSatoshis = ({ amount }: { amount: Amount }): bigint =>
	// Numbers like 0.00004 can be stored internally by JS as 0.0000399999999...
	// Therefore, when multiplied by 10 ** BTC_DECIMALS this can result in a float like 4000.0000000000005
	// To avoid errors while converting to bigint, we need to ignore the floating part
	BigInt((Number(amount) * 10 ** BTC_DECIMALS).toFixed(0));

export const convertSatoshisToBtc = (satoshis: bigint): string => {
	const btcValue = Number(satoshis) / 10 ** BTC_DECIMALS;
	return btcValue.toFixed(BTC_DECIMALS).replace(/\.?0+$/, '');
};
