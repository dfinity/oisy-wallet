import type { BigNumber } from '@ethersproject/bignumber';
import { Utils } from 'alchemy-sdk';

export const formatEtherShort = (value: BigNumber): string => {
	const res = Utils.formatEther(value);
	return (+res).toFixed(4);
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
