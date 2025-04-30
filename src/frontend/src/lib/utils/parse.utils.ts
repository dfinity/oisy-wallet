import { formatUnits, parseUnits, type BigNumberish } from 'ethers/utils';

export const parseToken = ({
	value,
	unitName = 18
}: {
	value: string;
	unitName?: BigNumberish;
}): bigint => parseUnits(value, unitName);

export const parseTokenToDecimals = ({
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
