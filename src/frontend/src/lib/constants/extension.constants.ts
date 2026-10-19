// Proof of concept. The unpacked extension in `src/extension` gets this fixed ID from the `key` in
// its manifest. OISY connects only to this ID, so no other extension can hand the popup a request.
export const OISY_EXTENSION_ID = 'fcdljkamhcheddlldbaffbpiopkcjcog';

export const OISY_EXTENSION_PORT_NAME = 'oisy-popup';
export const OISY_EXTENSION_PANEL_PORT_NAME = 'oisy-panel';

// Sent to the extension's side panel once OISY's page inside it has started.
export const OISY_EXTENSION_PANEL_READY = 'oisy-panel-ready';

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

// The oldest extension version OISY still answers, and released versions that were pulled. In
// production these would come from config OISY can change without a frontend release, so a bad
// version can be turned off within minutes. Both rely on the version the extension reports about
// itself: they keep old, honest versions out, but a malicious version can report any number.
export const OISY_EXTENSION_MIN_VERSION = '0.0.1';
export const OISY_EXTENSION_BLOCKED_VERSIONS: readonly string[] = [];
export const OISY_EXTENSION_OUTDATED_MESSAGE =
	'The OISY extension is out of date. Update it and try again.';
