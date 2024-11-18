import { BTC_DECIMALS } from '$env/tokens.btc.env';

export const convertNumberToSatoshis = ({ amount }: { amount: number | string }): bigint =>
	BigInt(Number(amount) * 10 ** BTC_DECIMALS);
