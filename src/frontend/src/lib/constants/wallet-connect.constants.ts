import { OISY_DESCRIPTION, OISY_ICON, OISY_NAME, OISY_URL } from '$lib/constants/oisy.constants';
import type { AuthClientTypes } from '@walletconnect/auth-client';
import type { ErrorResponse } from '@walletconnect/jsonrpc-utils';

export const WALLET_CONNECT_METADATA: AuthClientTypes.Metadata = {
	name: OISY_NAME,
	description: OISY_DESCRIPTION,
	url: OISY_URL,
	icons: [OISY_ICON]
};

export const SESSION_REQUEST_SEND_TRANSACTION = 'eth_sendTransaction';
export const SESSION_REQUEST_ETH_SIGN = 'eth_sign';
export const SESSION_REQUEST_PERSONAL_SIGN = 'personal_sign';
export const SESSION_REQUEST_ETH_SIGN_V4 = 'eth_signTypedData_v4';

export const UNEXPECTED_ERROR: ErrorResponse = {
	code: 20001,
	message: 'Unexpected error.'
};

export const CONTEXT_VALIDATION_ISSCAM = 'ISSCAM';
