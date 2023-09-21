import type { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { Utils } from 'alchemy-sdk';

export const parseToken = ({
	value,
	unitName = 18
}: {
	value: string;
	unitName?: string | BigNumberish;
}): BigNumber => Utils.parseUnits(value, unitName);
