/* eslint-disable vitest/require-top-level-describe */

// Backs the `$env/btc.env` mock in `vitest.setup.ts`. Every build runs with
// `BTC_SEND_VIA_BACKEND_ENABLED` on, but the Chain Fusion Signer path stays until it is removed, and
// most specs still cover it. So every test starts with it off, and a spec covering the backend path
// sets `enabled` in its own `beforeEach`.
export const btcSendViaBackend = { enabled: false };

export const resetBtcSendViaBackendBeforeEachTest = () => {
	beforeEach(() => {
		btcSendViaBackend.enabled = false;
	});
};
