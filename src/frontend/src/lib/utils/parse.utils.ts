import type { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { parseUnits } from '@ethersproject/units/src.ts';

export const parseToken = ({
	value,
	unitName = 18
}: {
	value: string;
	unitName?: string | BigNumberish;
}): BigNumber => parseUnits(value, unitName);
