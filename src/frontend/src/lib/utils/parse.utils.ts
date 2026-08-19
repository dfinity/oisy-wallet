import Decimal from 'decimal.js';
import { formatUnits, parseUnits, type BigNumberish } from 'ethers/utils';

const normalizeAmountString = (value: string): string => {
	if (!/[eE]/.test(value)) {
		return value;
	}

	// `ethers` decimal parsers reject scientific notation (e.g. 7.5e-7).
	// Normalise to plain decimal string before parsing token units.
	return new Decimal(value).toFixed();
};

export const parseToken = ({
	value,
	unitName = 18
}: {
	value: string;
	unitName?: BigNumberish;
}): bigint => parseUnits(normalizeAmountString(value), unitName);

// Same as `parseToken` but returns `undefined` instead of throwing when the
// value can't be represented as base units — non-numeric input, or a magnitude
// beyond the ledger's integer range so `parseUnits` overflows. Callers treat the
// `undefined` result as an invalid amount rather than silently skipping it.
export const tryParseToken = (params: {
	value: string;
	unitName?: BigNumberish;
}): bigint | undefined => {
	try {
		return parseToken(params);
	} catch {
		return undefined;
	}
};

export const normalizeTokenToDecimals = ({
	value,
	oldUnitName,
	newUnitName
}: {
	value: bigint;
	oldUnitName: BigNumberish;
	newUnitName: BigNumberish;
}): bigint =>
	parseToken({
		value: formatUnits(value, oldUnitName),
		unitName: newUnitName
	});
