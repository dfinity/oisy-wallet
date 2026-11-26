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

// The browser database in which WalletKit (through `@walletconnect/keyvaluestorage`) saves its
// sessions, pairings and keys.
export const WALLET_CONNECT_IDB_NAME = 'WALLET_CONNECT_V2_INDEXED_DB';

// Local storage key holding the principal of the identity the saved sessions belong to. The name
// must not contain `wc@`, `wc_`, `walletconnect` or `wallet_connect` (in any case): when that
// database starts empty, `@walletconnect/keyvaluestorage` moves such local storage keys into it.
export const WALLET_CONNECT_SESSIONS_OWNER_KEY = 'oisy_dapp_connections_owner';
