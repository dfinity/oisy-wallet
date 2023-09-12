import type { ErrorResponse } from '@walletconnect/jsonrpc-utils';

export const SESSION_REQUEST_SEND_TRANSACTION = 'eth_sendTransaction';
export const SESSION_REQUEST_ETH_SIGN = 'eth_sign';
export const SESSION_REQUEST_PERSONAL_SIGN = 'personal_sign';
export const SESSION_REQUEST_ETH_SIGN_V4 = 'eth_signTypedData_v4';

export const UNEXPECTED_ERROR: ErrorResponse = {
	code: 20001,
	message: 'Unexpected error.'
};
