import { OISY_DESCRIPTION, OISY_ICON, OISY_NAME, OISY_URL } from '$lib/constants/oisy.constants';
import type { WalletKitTypes } from '@reown/walletkit';
import type { ErrorResponse } from '@walletconnect/jsonrpc-utils';

export const WALLET_CONNECT_METADATA: WalletKitTypes.Metadata = {
	name: OISY_NAME,
	description: OISY_DESCRIPTION,
	url: OISY_URL,
	icons: [OISY_ICON]
};

export const UNEXPECTED_ERROR: ErrorResponse = {
	code: 20001,
	message: 'Unexpected error.'
};

export const CONTEXT_VALIDATION_ISSCAM = 'ISSCAM';
