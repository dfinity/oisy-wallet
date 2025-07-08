import { ETHEREUM_DEFAULT_DECIMALS } from '$env/tokens/tokens.eth.env';
import { MILLISECONDS_IN_DAY, NANO_SECONDS_IN_MILLISECOND } from '$lib/constants/app.constants';
import type { AmountString } from '$lib/types/amount';
import { isNullish, nonNullish } from '@dfinity/utils';
import { Utils } from 'alchemy-sdk';
import type { BigNumberish } from 'ethers/utils';

const DEFAULT_DISPLAY_DECIMALS = 4;
const MAX_DEFAULT_DISPLAY_DECIMALS = 8;

interface FormatTokenParams {
	value: bigint;
	unitName?: string | BigNumberish;
	displayDecimals?: number;
	trailingZeros?: boolean;
	showPlusSign?: boolean;
}

export const formatToken = ({
	value,
	unitName = ETHEREUM_DEFAULT_DECIMALS,
	displayDecimals,
	trailingZeros = false,
	showPlusSign = false
}: FormatTokenParams): AmountString => {
	const resRaw = Utils.formatUnits(value, unitName);
	const isNegative = resRaw.startsWith('-');
	const res = isNegative ? resRaw.slice(1) : resRaw;

	const match = res.match(/^0\.0*/);
	const leadingZeros = match ? match[0].length - 2 : 0;

	if (isNullish(displayDecimals) && leadingZeros >= MAX_DEFAULT_DISPLAY_DECIMALS) {
		return '< 0.00000001';
	}

	const maxFractionDigits = Math.min(leadingZeros + 2, MAX_DEFAULT_DISPLAY_DECIMALS);
	const minFractionDigits = displayDecimals ?? DEFAULT_DISPLAY_DECIMALS;
	const digitsToShow =
		displayDecimals ?? (leadingZeros > 2 ? maxFractionDigits : DEFAULT_DISPLAY_DECIMALS);

	const [intPart, fracPartRaw = ''] = res.split('.');
	const paddedFrac = (fracPartRaw + '0'.repeat(digitsToShow)).slice(0, digitsToShow + 1);

	const shouldRoundUp = +paddedFrac[digitsToShow] >= 5;
	const roundedFrac = paddedFrac
		.slice(0, digitsToShow)
		.split('')
		.reverse()
		.reduce<{ carry: number; digits: string[] }>(
			(acc, digit, idx) => {
				const offset = idx === 0 && shouldRoundUp ? 1 : acc.carry;
				const sum = +digit + offset;
				acc.carry = sum > 9 ? 1 : 0;
				acc.digits.push((sum % 10).toString());
				return acc;
			},
			{ carry: 0, digits: [] }
		);

	const finalFrac = roundedFrac.digits.reverse().join('');
	const finalInt = (BigInt(intPart) + BigInt(roundedFrac.carry)).toString();

	const result = finalFrac.length > 0 ? `${finalInt}.${finalFrac}` : finalInt;

	const trimmed = trailingZeros
		? result.padEnd(result.indexOf('.') + 1 + minFractionDigits, '0')
		: result.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');

	const prefix = isNegative ? '-' : showPlusSign && +res > 0 ? '+' : '';

	return `${prefix}${trimmed as `${number}`}`;
};

export const formatTokenBigintToNumber = (params: FormatTokenParams): number =>
	Number(formatToken(params));

/**
 * Shortens the text from the middle. Ex: "12345678901234567890" -> "1234567...5678901"
 * @param text
 * @param splitLength An optional length for the split. e.g. 12345678 becomes, if splitLength = 2, 12...78
 * @returns text
 */
export const shortenWithMiddleEllipsis = ({
	text,
	splitLength = 7
}: {
	text: string;
	splitLength?: number;
}): string => {
	// Original min length was 16 to extract 7 split
	const minLength = splitLength * 2 + 2;
	return text.length > minLength
		? `${text.slice(0, splitLength)}...${text.slice(-1 * splitLength)}`
		: text;
};

const DATE_TIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
	month: 'short',
	day: 'numeric',
	year: 'numeric',
	hour: '2-digit',
	minute: '2-digit',
	hour12: false
};

export const formatSecondsToDate = ({
	seconds,
	i18n
}: {
	seconds: number;
	i18n?: I18n;
}): string => {
	const date = new Date(seconds * 1000);
	return date.toLocaleDateString(i18n?.lang ?? 'en', DATE_TIME_FORMAT_OPTIONS);
};

export const formatNanosecondsToDate = ({
	nanoseconds,
	i18n
}: {
	nanoseconds: bigint;
	i18n?: I18n;
}): string => {
	const date = new Date(Number(nanoseconds / NANO_SECONDS_IN_MILLISECOND));
	return date.toLocaleDateString(i18n?.lang ?? 'en', DATE_TIME_FORMAT_OPTIONS);
};

export const formatNanosecondsToTimestamp = (nanoseconds: bigint): number => {
	const date = new Date(Number(nanoseconds / NANO_SECONDS_IN_MILLISECOND));
	return date.getTime();
};

export const formatToShortDateString = ({ date, i18n }: { date: Date; i18n: I18n }): string =>
	date.toLocaleDateString(i18n?.lang ?? 'en', { month: 'long' });

const getRelativeTimeFormatter = (i18n?: I18n) =>
	new Intl.RelativeTimeFormat(i18n?.lang ?? 'en', { numeric: 'auto' });

/** Formats a number of seconds to a normalized date string.
 *
 * If the date is within the same year, it returns the day and month name.
 * If the date is in a different year, it returns the day, month, and year.
 * If the date is within 2 days, it returns a relative time format (today or yesterday).
 * It accepts an optional currentDate parameter to compare the date with. Otherwise, it uses the current date.
 *
 * @param {Object} params - The options object.
 * @param {number} params.seconds - The number of seconds to format.
 * @param {Date} [params.currentDate] - The date to compare with. Defaults to the current date.
 */
export const formatSecondsToNormalizedDate = ({
	seconds,
	currentDate,
	i18n
}: {
	seconds: number;
	currentDate?: Date;
	i18n?: I18n;
}): string => {
	const date = new Date(seconds * 1000);
	const today = currentDate ?? new Date();

	// TODO: add additional test suite for the below calculations
	const dateUTC = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
	const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
	const daysDifference = Math.ceil((dateUTC - todayUTC) / MILLISECONDS_IN_DAY);

	if (Math.abs(daysDifference) < 2) {
		// TODO: When the method is called many times with the same arguments, it is better to create a Intl.DateTimeFormat object and use its format() method, because a DateTimeFormat object remembers the arguments passed to it and may decide to cache a slice of the database, so future format calls can search for localization strings within a more constrained context.
		return getRelativeTimeFormatter(i18n).format(daysDifference, 'day');
	}

	// Same year, return day and month name
	if (date.getFullYear() === today.getFullYear()) {
		return date.toLocaleDateString(i18n?.lang ?? 'en', { day: 'numeric', month: 'long' });
	}

	// Different year, return day, month, and year
	return date.toLocaleDateString(i18n?.lang ?? 'en', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});
};

export const formatUSD = ({
	value,
	options
}: {
	value: number;
	options?: {
		minFraction?: number;
		maxFraction?: number;
		maximumSignificantDigits?: number;
		symbol?: boolean;
	};
}): string => {
	const {
		minFraction = 2,
		maxFraction = 2,
		maximumSignificantDigits,
		symbol = true
	} = options ?? {};

	return new Intl.NumberFormat('en-US', {
		...(symbol && { style: 'currency', currency: 'USD' }),
		minimumFractionDigits: minFraction,
		maximumFractionDigits: maxFraction,
		...(nonNullish(maximumSignificantDigits) && { maximumSignificantDigits })
	})
		.format(value)
		.replace(/,/g, '’');
};
