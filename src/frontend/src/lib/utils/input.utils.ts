import { BTC_DUST_THRESHOLD_SATOSHIS } from '$btc/constants/btc.constants';
import type { OptionAmount } from '$lib/types/send';
import type { OptionString } from '$lib/types/string';
import type { Option } from '$lib/types/utils';
import { isEmptyString, isNullish } from '@dfinity/utils';

export const isNullishOrEmpty = (value: OptionString): value is Option<''> => isEmptyString(value);

export const invalidAmount = (amount: OptionAmount): boolean =>
	isNullish(amount) || Number(amount) < 0;

export const invalidSendAmount = (amount: OptionAmount): boolean =>
	isNullish(amount) || Number(amount) <= BTC_DUST_THRESHOLD_SATOSHIS;
