import { BTC_DECIMALS } from '$env/tokens.btc.env';

export const convertNumberToSatoshis = ({ amount }: { amount: number }): bigint =>
	BigInt(amount * 10 ** BTC_DECIMALS);
