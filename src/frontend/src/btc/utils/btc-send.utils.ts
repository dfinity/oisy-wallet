import { BTC_DECIMALS } from '$env/tokens.btc.env';
import type { Amount } from '$lib/types/send';

export const convertNumberToSatoshis = ({ amount }: { amount: Amount }): bigint =>
	BigInt(Number(amount) * 10 ** BTC_DECIMALS);
