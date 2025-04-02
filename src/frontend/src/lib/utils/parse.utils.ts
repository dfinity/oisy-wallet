import { Utils } from 'alchemy-sdk';
import type { BigNumberish } from 'ethers/utils';

export const parseToken = ({
	value,
	unitName = 18
}: {
	value: string;
	unitName?: string | BigNumberish;
}): bigint => Utils.parseUnits(value, unitName).toBigInt();
