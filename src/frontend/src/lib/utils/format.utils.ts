import { ETHEREUM_DEFAULT_DECIMALS } from '$env/tokens.env';
import { MILLISECONDS_IN_DAY, NANO_SECONDS_IN_MILLISECOND } from '$lib/constants/app.constants';
import { nonNullish } from '@dfinity/utils';
import type { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { Utils } from 'alchemy-sdk';

export const formatToken = ({
	value,
	unitName = ETHEREUM_DEFAULT_DECIMALS,
	displayDecimals = 4,
	trailingZeros = false
}: {
	value: BigNumber;
	unitName?: string | BigNumberish;
	displayDecimals?: number;
	trailingZeros?: boolean;
}): string => {
	const res = Utils.formatUnits(value, unitName);
	const formatted = (+res).toLocaleString('en-US', {
		useGrouping: false,
		maximumFractionDigits: displayDecimals,
		minimumFractionDigits: trailingZeros ? displayDecimals : undefined
	});

	if (trailingZeros) {
		return formatted;
	}

	return formatted.replace(/\.0+$/, '');
};

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

export const formatSecondsToDate = (seconds: number): string => {
	const date = new Date(seconds * 1000);
	return date.toLocaleDateString('en', DATE_TIME_FORMAT_OPTIONS);
};

export const formatNanosecondsToDate = (nanoseconds: bigint): string => {
	const date = new Date(Number(nanoseconds / NANO_SECONDS_IN_MILLISECOND));
	return date.toLocaleDateString('en', DATE_TIME_FORMAT_OPTIONS);
};

export const formatSecondsToNormalizedDate = ({
	seconds,
	currentDate
}: {
	seconds: number;
	currentDate?: Date;
}): string => {
	const date = new Date(seconds * 1000);
	const today = currentDate ?? new Date();
	const daysDifference = Math.ceil((date.getTime() - today.getTime()) / MILLISECONDS_IN_DAY);

	if (Math.abs(daysDifference) < 2) {
		// TODO: When the method is called many times with the same arguments, it is better to create a Intl.DateTimeFormat object and use its format() method, because a DateTimeFormat object remembers the arguments passed to it and may decide to cache a slice of the database, so future format calls can search for localization strings within a more constrained context.
		return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(daysDifference, 'day');
	}

	// Same year, return day and month name
	if (date.getFullYear() === today.getFullYear()) {
		return date.toLocaleDateString('en', { day: 'numeric', month: 'long' });
	}

	// Different year, return day, month, and year
	return date.toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' });
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
