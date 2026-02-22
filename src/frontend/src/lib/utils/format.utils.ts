import { USE_NATIVE_CURRENCY_LOCALE } from '$env/currency.env';
import { ETHEREUM_DEFAULT_DECIMALS } from '$env/tokens/tokens.eth.env';
import { MILLISECONDS_IN_DAY, NANO_SECONDS_IN_MILLISECOND } from '$lib/constants/app.constants';
import { Currency } from '$lib/enums/currency';
import { Languages } from '$lib/enums/languages';
import type { AmountString } from '$lib/types/amount';
import type { CurrencyExchangeData } from '$lib/types/currency';
import { getCurrencyDecimalDigits } from '$lib/utils/currency.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import Decimal from 'decimal.js';
import { formatUnits, type BigNumberish } from 'ethers/utils';

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
	const parsedUnitName: BigNumberish =
		typeof unitName === 'number' || typeof unitName === 'bigint'
			? unitName
			: /^\d+$/.test(unitName)
				? BigInt(unitName)
				: unitName;

	const res = formatUnits(value, parsedUnitName);

	const match = res.match(/^0\.0*/);
	const leadingZeros = match ? match[0].length - 2 : 0;

	if (isNullish(displayDecimals) && leadingZeros >= MAX_DEFAULT_DISPLAY_DECIMALS) {
		return '< 0.00000001';
	}

	const maxFractionDigits = Math.min(leadingZeros + 2, MAX_DEFAULT_DISPLAY_DECIMALS);
	const minFractionDigits = displayDecimals ?? DEFAULT_DISPLAY_DECIMALS;

	const dec = new Decimal(res);
	const maxDigits =
		displayDecimals ?? (leadingZeros > 2 ? maxFractionDigits : DEFAULT_DISPLAY_DECIMALS);
	const decDP = dec.toDecimalPlaces(maxDigits);
	const minDigits = trailingZeros ? Math.max(minFractionDigits, maxDigits) : undefined;

	const formatted = decDP.toFixed(minDigits) as `${number}`;

	if (trailingZeros) {
		return formatted;
	}

	return `${showPlusSign && +res > 0 ? '+' : ''}${formatted}`;
};

export const formatTokenBigintToNumber = (params: FormatTokenParams): number =>
	Number(formatToken(params));

/**
 * Shortens the text from the middle. Ex: "12345678901234567890" -> "1234567...5678901"
 * @param text
 * @param splitLength An optional length for the split. e.g. 12,345,678 becomes if splitLength = 2, 12...78
 * @returns text
 */
export const shortenWithMiddleEllipsis = ({
	text,
	splitLength = 7
}: {
	text: string;
	splitLength?: number;
}): string => {
	// Original min length was 16 to extract split 7
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
	language,
	formatOptions,
	timeOnly = false
}: {
	seconds: number;
	language?: Languages;
	formatOptions?: Intl.DateTimeFormatOptions;
	timeOnly?: boolean;
}): string => {
	const date = new Date(seconds * 1000);
	return date[timeOnly ? 'toLocaleTimeString' : 'toLocaleDateString'](
		language ?? Languages.ENGLISH,
		nonNullish(formatOptions)
			? {
					...DATE_TIME_FORMAT_OPTIONS,
					...formatOptions,
					...(timeOnly && { day: undefined, month: undefined, year: undefined })
				}
			: DATE_TIME_FORMAT_OPTIONS
	);
};

export const formatNanosecondsToDate = ({
	nanoseconds,
	language
}: {
	nanoseconds: bigint;
	language?: Languages;
}): string => {
	const date = new Date(Number(nanoseconds / NANO_SECONDS_IN_MILLISECOND));
	return date.toLocaleDateString(language ?? Languages.ENGLISH, DATE_TIME_FORMAT_OPTIONS);
};

export const formatNanosecondsToTimestamp = (nanoseconds: bigint): number => {
	const date = new Date(Number(nanoseconds / NANO_SECONDS_IN_MILLISECOND));
	return date.getTime();
};

export const formatToShortDateString = ({ date, i18n }: { date: Date; i18n: I18n }): string =>
	date.toLocaleDateString(i18n?.lang ?? Languages.ENGLISH, { month: 'short' });

const getRelativeTimeFormatter = (language?: Languages) =>
	new Intl.RelativeTimeFormat(language ?? Languages.ENGLISH, { numeric: 'auto' });

/** Formats a number of seconds to a normalised date string.
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
	language
}: {
	seconds: number;
	currentDate?: Date;
	language?: Languages;
}): string => {
	const date = new Date(seconds * 1000);
	const today = currentDate ?? new Date();

	// TODO: add additional test suite for the below calculations
	const dateUTC = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
	const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
	const daysDifference = Math.ceil((dateUTC - todayUTC) / MILLISECONDS_IN_DAY);

	if (Math.abs(daysDifference) < 2) {
		// TODO: When the method is called many times with the same arguments, it is better to create a Intl.DateTimeFormat object and use its format() method, because a DateTimeFormat object remembers the arguments passed to it and may decide to cache a slice of the database, so future format calls can search for localization strings within a more constrained context.
		return getRelativeTimeFormatter(language).format(daysDifference, 'day');
	}

	// Same year, return day and month name
	if (date.getFullYear() === today.getFullYear()) {
		return date.toLocaleDateString(language ?? Languages.ENGLISH, {
			day: 'numeric',
			month: 'long'
		});
	}

	// Different year, return day, month, and year
	return date.toLocaleDateString(language ?? Languages.ENGLISH, {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});
};

/** Formats a timestamp to a day difference.
 *
 * It uses the current date to compare the date with.
 *
 * @param {Object} params - The option object.
 * @param {number} params.timestamp - The timestamp to format.
 * @param {number} params.language - Current language.
 */
export const formatTimestampToDaysDifference = ({
	timestamp,
	language
}: {
	timestamp: number;
	language?: Languages;
}): string => {
	const date = new Date(timestamp);
	const today = new Date();

	const dateUTC = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
	const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
	const daysDifference = Math.ceil((dateUTC - todayUTC) / MILLISECONDS_IN_DAY);

	return getRelativeTimeFormatter(language).format(daysDifference, 'day');
};

export const formatCurrency = ({
	value,
	currency,
	exchangeRate: { exchangeRateToUsd, currency: exchangeRateCurrency },
	language,
	notBelowThreshold = false,
	hideSymbol = false,
	normalizeSeparators = false,
	useMinSignificantDigits = false
}: {
	value: number;
	currency: Currency;
	exchangeRate: CurrencyExchangeData;
	language: Languages;
	notBelowThreshold?: boolean;
	hideSymbol?: boolean;
	normalizeSeparators?: boolean;
	useMinSignificantDigits?: boolean;
}): string | undefined => {
	if (currency !== exchangeRateCurrency) {
		// There could be a case where, after a currency switch, the exchange rate is still the one of the old currency, until the worker updates it
		return;
	}

	if (isNullish(exchangeRateToUsd) || exchangeRateToUsd === 0) {
		// If the exchange rate is not available (probably right after a currency switch), we cannot format the currency
		return;
	}

	const locale = USE_NATIVE_CURRENCY_LOCALE[language] ? language : 'en-US';

	const convertedValue = value / exchangeRateToUsd;

	const decimalDigits = getCurrencyDecimalDigits({ currency, language });

	const getSignificantOpts = (): Partial<Intl.NumberFormatOptions> => {
		if (!useMinSignificantDigits) {
			return {};
		}

		// Threshold: 2dp -> 1, 0dp (JPY) -> 100, 3dp -> 0.1, etc.
		const threshold = Math.pow(10, 2 - decimalDigits);

		if (Math.abs(convertedValue) >= threshold) {
			return {};
		}

		// Baseline: 2dp currencies => 4 fraction digits, JPY => 2 fraction digits
		const baselineFractionDigits = decimalDigits + 2;

		// Ensure at least 4 significant digits for very small numbers
		const abs = Math.abs(convertedValue);
		const fractionFor4Sig =
			abs === 0 ? baselineFractionDigits : Math.max(0, -Math.floor(Math.log10(abs)) + (4 - 1));

		const maxFractionDigits = Math.max(baselineFractionDigits, fractionFor4Sig);

		return {
			minimumFractionDigits: baselineFractionDigits,
			maximumFractionDigits: maxFractionDigits
		};
	};

	const significantOpts = getSignificantOpts();

	const currencyFormatter = new Intl.NumberFormat(locale, {
		style: 'currency',
		currency: currency.toUpperCase(),
		...(hideSymbol && { currencyDisplay: 'code' }),
		...significantOpts
	});

	if (notBelowThreshold) {
		const minThreshold = 1 / Math.pow(10, decimalDigits);

		if (Math.abs(convertedValue) < minThreshold) {
			return `< ${currencyFormatter.format(minThreshold)}`;
		}
	}

	const formatted = currencyFormatter
		.format(convertedValue)
		.replace(hideSymbol ? currency.toUpperCase() : '', '')
		.trim();

	if (normalizeSeparators) {
		const parts = currencyFormatter.formatToParts(123456.78);
		const groupSep = parts.find((p) => p.type === 'group')?.value ?? '';
		const decimalSep = parts.find((p) => p.type === 'decimal')?.value ?? '.';

		return (
			formatted
				// Remove group separators (thousands)
				.replaceAll(groupSep, '')
				// Replace the decimal separator with '.'
				.replace(decimalSep, '.')
		);
	}

	if (currency === Currency.CHF) {
		return formatted.replace(/,/g, '’');
	}

	return formatted;
};

export const formatStakeApyNumber = (apy: number): string => {
	if (apy >= 100) {
		return `${Math.round(apy)}`;
	}

	if (apy >= 10) {
		return (Math.round(apy * 10) / 10).toFixed(1);
	}

	if (apy > 0) {
		return (Math.round(apy * 100) / 100).toFixed(2);
	}

	return '0';
};

export const format24hChangeInCurrency = ({
	usdChangePct,
	currency,
	exchangeRate: { exchangeRate24hChangeMultiplier, currency: exchangeRateCurrency },
	language
}: {
	usdChangePct: number;
	currency: Currency;
	exchangeRate: CurrencyExchangeData;
	language: Languages;
}): { formattedAbs: string; sign: 'positive' | 'negative' | 'zero' } | undefined => {
	if (currency !== exchangeRateCurrency) {
		// After a currency switch, the exchange rate might still be for the old currency
		return;
	}

	if (isNullish(exchangeRate24hChangeMultiplier) || exchangeRate24hChangeMultiplier === 0) {
		return;
	}

	const locale = USE_NATIVE_CURRENCY_LOCALE[language] ? language : 'en-US';

	const usdMultiplier = 1 + usdChangePct / 100;
	const currencyMultiplier = usdMultiplier / exchangeRate24hChangeMultiplier;
	const currencyChangePct = (currencyMultiplier - 1) * 100;

	const raw = Object.is(currencyChangePct, -0) ? 0 : currencyChangePct;

	const absPct = Math.abs(raw);

	// decimals rule:
	// 1) >= 100% -> 0 decimals
	// 2) >= 10%  -> 1 decimal
	// 3) < 10%   -> 2 decimals
	const fractionDigits = absPct >= 100 ? 0 : absPct >= 10 ? 1 : 2;

	const percentFormatter = new Intl.NumberFormat(locale, {
		style: 'percent',
		signDisplay: 'never',
		minimumFractionDigits: fractionDigits,
		maximumFractionDigits: fractionDigits
	});

	// Decide rounding first, then decide sign from the rounded value
	const roundedAbsPct = Number(absPct.toFixed(fractionDigits));

	// sign (treat -0 as 0)
	const sign: 'positive' | 'negative' | 'zero' =
		roundedAbsPct === 0 ? 'zero' : raw > 0 ? 'positive' : 'negative';

	return {
		formattedAbs: percentFormatter.format(absPct / 100),
		sign
	};
};
