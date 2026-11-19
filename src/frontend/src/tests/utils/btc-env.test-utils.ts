/* eslint-disable vitest/require-top-level-describe */

// Backs the `$env/btc.env` mock in `vitest.setup.ts`. Tests run as a local build, where
// `BTC_SEND_VIA_BACKEND_ENABLED` is on, while production runs with it off. So every test starts with
// it off, and a spec covering the backend path sets `enabled` in its own `beforeEach`.
export const btcSendViaBackend = { enabled: false };

export const resetBtcSendViaBackendBeforeEachTest = () => {
	beforeEach(() => {
		btcSendViaBackend.enabled = false;
	});
};
