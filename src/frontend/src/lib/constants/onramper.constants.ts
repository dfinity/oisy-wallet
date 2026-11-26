// How much longer Buy/Sell waits for OnRamper's lists once the backend has signed the widget URL.
// After that it opens without them, and the request carries on for the next opening.
export const ONRAMPER_IDS_GRACE_MS = 1_000;

// A list request that hangs is given up after this, so that the next opening asks again.
export const ONRAMPER_SUPPORTED_TIMEOUT_MS = 30_000;
