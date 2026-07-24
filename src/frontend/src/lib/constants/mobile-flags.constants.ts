// Feature flags for the native (Capacitor) mobile apps — POC.
//
// Each flag gates a feature INSIDE the native shell only; the web app is never
// affected (the gates all test `isNativePlatform()` first). Flip to `true` once
// the feature is verified to work in the WebView context.

// Onramper Buy: the widget URL must be signed by the backend and the flow is
// untested inside the WebView — disabled until verified.
export const MOBILE_APP_BUY_ENABLED = false;

// OISY-as-signer (ICRC-25/29 popup flows): architecturally impossible in the
// shell — the flow assumes a dapp-opened browser popup with `window.opener`.
export const MOBILE_APP_SIGNER_ENABLED = false;
