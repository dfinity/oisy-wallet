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

// `parseToken` throws (e.g. ethers' `RangeError: overflow` for an out-of-range
// amount like `1e400`). Callers that run in async/debounced contexts cannot let
// that surface as an unhandled error, so this returns `undefined` instead of
// throwing to signal an unparseable amount.
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
