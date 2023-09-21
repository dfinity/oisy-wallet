import type { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { Utils } from 'alchemy-sdk';

export const formatTokenShort = ({
	value,
	unitName = 18,
	displayDecimals = 4
}: {
	value: BigNumber;
	unitName?: string | BigNumberish;
	displayDecimals?: number;
}): string => {
	const res = Utils.formatUnits(value, unitName);
	return (+res).toFixed(displayDecimals).replace(/(\.0+|0+)$/, '');
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

export const formatToDate = (seconds: number): string => {
	const options: Intl.DateTimeFormatOptions = {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false
	};

	const date = new Date(seconds * 1000);
	return date.toLocaleDateString('en', options);
};
