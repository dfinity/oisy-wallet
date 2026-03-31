import Decimal from 'decimal.js';
import { formatUnits, parseUnits, type BigNumberish } from 'ethers/utils';

const normalizeAmountString = (value: string): string => {
	if (!/[eE]/.test(value)) {
		return value;
	}

	// `ethers` decimal parsers reject scientific notation (e.g. 7.5e-7).
	// Normalize to plain decimal string before parsing token units.
	return new Decimal(value).toFixed();
};

export const parseToken = ({
	value,
	unitName = 18
}: {
	value: string;
	unitName?: BigNumberish;
}): bigint => parseUnits(normalizeAmountString(value), unitName);

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
