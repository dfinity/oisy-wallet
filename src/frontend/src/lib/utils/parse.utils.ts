import type { BigNumberish } from '@ethersproject/bignumber';
import { Utils } from 'alchemy-sdk';

export const parseToken = ({
	value,
	unitName = 18
}: {
	value: string;
	unitName?: string | BigNumberish;
}): bigint => Utils.parseUnits(value, unitName).toBigInt();
