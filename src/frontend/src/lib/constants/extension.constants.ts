// Proof of concept. The unpacked extension in `src/extension` gets this fixed ID from the `key` in
// its manifest. OISY connects only to this ID, so no other extension can hand the popup a request.
export const OISY_EXTENSION_ID = 'fcdljkamhcheddlldbaffbpiopkcjcog';

export const OISY_EXTENSION_PORT_NAME = 'oisy-popup';

export const OISY_EXTENSION_REQUEST_PARAM = 'request';

// The extension's background worker sleeps after 30 seconds without events. A request can stay open
// longer than that while the user signs in, so the popup pings it.
export const OISY_EXTENSION_KEEP_ALIVE_MS = 20_000;

// Extension requests reuse the WalletConnect review screens, which address a request by topic.
export const OISY_EXTENSION_WALLET_CONNECT_TOPIC = 'oisy-extension';

// EIP-1193 codes the dapp receives.
export const OISY_EXTENSION_USER_REJECTED_CODE = 4001;
export const OISY_EXTENSION_USER_REJECTED_MESSAGE = 'The user rejected the request.';
export const OISY_EXTENSION_INTERNAL_ERROR_CODE = -32603;
