import { ETHEREUM_DEFAULT_DECIMALS } from '$env/tokens.env';
import { NANO_SECONDS_IN_MILLISECOND } from '$lib/constants/app.constants';
import { nonNullish } from '@dfinity/utils';
import type { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { Utils } from 'alchemy-sdk';

export const formatToken = ({
	value,
	unitName = ETHEREUM_DEFAULT_DECIMALS,
	displayDecimals = 4,
	trailingZeros = true
}: {
	value: BigNumber;
	unitName?: string | BigNumberish;
	displayDecimals?: number;
	trailingZeros?: boolean;
}): string => {
	const res = Utils.formatUnits(value, unitName);
	const formatted = (+res).toLocaleString('en-US', {
		useGrouping: false,
		maximumFractionDigits: displayDecimals
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
export const shortenWithMiddleEllipsis = (text: string, splitLength = 7): string => {
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

export const formatUSD = (
	value: number,
	options?: {
		minFraction?: number;
		maxFraction?: number;
		maximumSignificantDigits?: number;
		symbol?: boolean;
	} & Pick<Intl.NumberFormatOptions, 'notation'>
): string => {
	const {
		minFraction = 2,
		maxFraction = 2,
		maximumSignificantDigits,
		symbol = true,
		notation
	} = options ?? {};

	return new Intl.NumberFormat('en-US', {
		...(symbol && { style: 'currency', currency: 'USD' }),
		notation,
		minimumFractionDigits: minFraction,
		maximumFractionDigits: maxFraction,
		...(nonNullish(maximumSignificantDigits) && { maximumSignificantDigits })
	})
		.format(value)
		.replace(/,/g, '’');
};
