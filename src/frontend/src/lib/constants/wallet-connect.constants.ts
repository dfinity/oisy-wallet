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

// How long the Settings switch lets the user sign the WalletConnect transactions OISY refuses because
// its review cannot show what they do: long enough for a flow of a few requests, short enough that
// it is never left on and forgotten.
export const WALLET_CONNECT_UNCHECKED_SIGNING_DURATION_MS = 5 * 60 * 1_000;
