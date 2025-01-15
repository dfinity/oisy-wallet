import type { WalletConnectEthSignTypedDataV4 } from '$eth/types/wallet-connect';
import { CONTEXT_VALIDATION_ISSCAM } from '$lib/constants/wallet-connect.constants';
import { isEthAddress } from '$lib/utils/account.utils';
import { isNullish } from '@dfinity/utils';
import type { Verify } from '@walletconnect/types';
import { Utils } from 'alchemy-sdk';
import { utils } from 'ethers';

export const getSignParamsMessageHex = (params: string[]): string =>
	params.filter((p) => !isEthAddress(p))[0];

export const getSignParamsMessageUtf8 = (params: string[]): string => {
	const message = getSignParamsMessageHex(params);
	return convertHexToUtf8(message);
};

export const getSignParamsMessageTypedDataV4 = (
	params: string[]
): WalletConnectEthSignTypedDataV4 => {
	const message = getSignParamsMessageHex(params);
	return JSON.parse(message);
};

export const getSignParamsMessageTypedDataV4Hash = (params: string[]): string => {
	const { domain, types, message } = getSignParamsMessageTypedDataV4(params);
	const { EIP712Domain: _, ...rest } = types;
	return utils._TypedDataEncoder.hash(domain, { ...rest }, message);
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

export const acceptedContext = (context: Verify.Context | undefined): boolean =>
	isNullish(context) || context.verified.validation.toUpperCase() !== CONTEXT_VALIDATION_ISSCAM;
