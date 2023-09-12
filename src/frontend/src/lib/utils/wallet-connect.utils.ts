import { isAddress } from '@ethersproject/address';
import { Utils } from 'alchemy-sdk';

export const getSignParamsMessageHex = (params: string[]): string =>
	params.filter((p) => !isAddress(p))[0];

export const getSignParamsMessage = (params: string[]): string => {
	const message = getSignParamsMessageHex(params);
	return convertHexToUtf8(message);
};

export const convertHexToUtf8 = (value: string): string => {
	if (Utils.isHexString(value)) {
		try {
			return Utils.toUtf8String(value);
		} catch (err: unknown) {
			// We ignore the issue and display the encoded value for now.
			console.error(err);
		}
	}

	return value;
};
