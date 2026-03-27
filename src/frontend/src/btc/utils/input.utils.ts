import { BTC_MINIMUM_AMOUNT } from '$btc/constants/btc.constants';
import type { OptionAmount } from '$lib/types/send';
import { isNullish } from '@dfinity/utils';

export const invalidSendAmount = (amount: OptionAmount): boolean =>
	isNullish(amount) || Number(amount) < BTC_MINIMUM_AMOUNT;
