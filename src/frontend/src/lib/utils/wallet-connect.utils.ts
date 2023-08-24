import { isAddress } from '@ethersproject/address';
import { Utils } from 'alchemy-sdk';

export const getSignParamsMessage = (params: string[]): string => {
	const message = params.filter((p) => !isAddress(p))[0];

	return convertHexToUtf8(message);
};

export const convertHexToUtf8 = (value: string): string => {
	if (Utils.isHexString(value)) {
		return Utils.toUtf8String(value);
	}

	return value;
};
