import { type BigNumberish, parseUnits } from 'ethers/utils';

export const parseToken = ({
	value,
	unitName = 18
}: {
	value: string;
	unitName?: string | BigNumberish;
}): bigint => parseUnits(value, unitName);
