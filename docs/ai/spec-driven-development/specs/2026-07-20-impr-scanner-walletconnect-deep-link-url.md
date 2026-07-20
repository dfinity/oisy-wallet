# Spec: Accept OISY WalletConnect deep-link URLs in the universal scanner

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

## Goal

Let the universal scanner start a WalletConnect pairing when the user scans (or
pastes) a **full OISY WalletConnect deep-link URL**, not just a bare `wc:` URI.

A dApp / pairing tool may present its WalletConnect pairing code wrapped in an
OISY deep link, e.g.

```
https://oisy.com/wc/?uri=wc%3Ae2001310...a0911dcd%402%3FexpiryTimestamp%3D1784537876%26relay-protocol%3Dirn%26symKey%3Dd764c4aa...813418
```

Today the scanner only recognises the inner `wc:` URI. When the outer URL is
scanned, it does not start a pairing — it falls through to the OpenCryptoPay
handler and fails as an invalid code. This spec makes the scanner unwrap such a
URL, **but only when its host is OISY's own domain**, and then treat the
extracted `uri` exactly like a directly-scanned `wc:` URI.

Source: user request.

---

## Background

### How the scanner classifies a code today

`src/frontend/src/lib/components/scanner/ScannerCode.svelte` runs every scanned
or manually-entered string through `processCode` (`:94-162`). The first branch is
a literal prefix test:

```ts
const WALLET_CONNECT_URI_PREFIX = 'wc:'; // :49

const processCode = async (code: string) => {
	if (code.startsWith(WALLET_CONNECT_URI_PREFIX)) {
		// :95
		onNext({ results: ScannerResults.WALLET_CONNECT, code });
		return;
	}
	// ...SOL / BTC / IC address checks, then OpenCryptoPay fallthrough
};
```

`onNext` routes `ScannerResults.WALLET_CONNECT` to `startWalletConnect` in
`ScannerModal.svelte` (`:98-106`), which calls `connectListener({ uri, ... })`
(`wallet-connect.services.ts:248`). A URL like the one above does **not** start
with `wc:`, so it skips this branch and ends up in the OpenCryptoPay path
(`:119-162`), surfacing "code / link is not valid".

### The deep-link URL already exists as a route

OISY already has a `/wc/` route that reads the `uri` search param for the
navigation (not scan) case:

- `AppPath.WalletConnect = '/wc/'` and `URI_PARAM = 'uri'` —
  `src/frontend/src/lib/constants/routes.constants.ts:10,31`.
- `loadRouteParams` decodes the `uri` param —
  `src/frontend/src/lib/utils/nav.utils.ts`.
- `WalletConnectSession.uriConnect` opens the universal scanner modal seeded
  with that URI.

So the URL shape (`<origin>/wc/?uri=<url-encoded wc: uri>`) is an existing OISY
convention. What is missing is handling that same URL when it arrives through the
**scanner** (camera or paste) rather than as a navigated route.

### The "correct domain"

`OISY_URL_HOSTNAME` (`src/frontend/src/lib/constants/oisy.constants.ts:77`,
`new URL(OISY_URL).hostname`, where `OISY_URL = VITE_OISY_DOMAIN`) is the host of
the **running environment** — `oisy.com` in production, and the staging / test
host on those builds. Matching against it keeps the check environment-consistent
(same-origin): a build only unwraps deep links that point at itself.

---

## Behaviour

When a code is scanned or pasted, the scanner treats it as a WalletConnect
pairing if **either**:

1. It is a bare `wc:` URI (unchanged from today); or
2. It is a URL whose host equals `OISY_URL_HOSTNAME`, whose path is the
   WalletConnect route (`/wc/`), and whose `uri` search param is itself a `wc:`
   URI. The scanner unwraps the `uri` param (URL-decoding it) and pairs with that
   inner value.

In both cases the scanner passes the resolved `wc:` URI to the existing
`ScannerResults.WALLET_CONNECT` → `startWalletConnect` → `connectListener` path.
Nothing downstream changes.

### Negative guarantees (what it does _not_ do)

- **Does not** unwrap a `uri` param from a non-OISY host. A URL like
  `https://evil.example/wc/?uri=wc:...` is **not** treated as WalletConnect; it
  falls through to the existing handlers (and ultimately the invalid-code path),
  exactly as today.
- **Does not** treat an OISY URL on a different path (e.g.
  `https://oisy.com/tokens/?uri=wc:...`) as a pairing.
- **Does not** treat an OISY `/wc/` URL whose `uri` param is absent or is not a
  `wc:` value as a pairing.
- **Does not** change the classification order, the SOL / BTC / IC address
  detection, or the OpenCryptoPay fallthrough.
- **Does not** add a new dependency, route, feature flag, or top-level folder.

---

## Implementation

### 1. New util — `src/frontend/src/lib/utils/scanner.utils.ts`

A single pure, easily-testable function that owns WalletConnect detection for the
scanner:

```ts
import { OISY_URL_HOSTNAME } from '$lib/constants/oisy.constants';
import { AppPath, URI_PARAM } from '$lib/constants/routes.constants';
import { isNullish } from '@dfinity/utils';

const WALLET_CONNECT_URI_PREFIX = 'wc:';

/**
 * Resolves a scanned/pasted code to a WalletConnect URI, or `undefined` if it is
 * not one. Accepts a bare `wc:` URI, or an OISY WalletConnect deep-link URL
 * (`<OISY origin>/wc/?uri=<url-encoded wc: uri>`). The URL form is only unwrapped
 * when its host is OISY's own domain, so a `uri` param from any other origin is
 * ignored.
 */
export const extractWalletConnectUri = (code: string): string | undefined => {
	if (code.startsWith(WALLET_CONNECT_URI_PREFIX)) {
		return code;
	}

	let url: URL;
	try {
		url = new URL(code);
	} catch (_: unknown) {
		return undefined;
	}

	if (url.hostname !== OISY_URL_HOSTNAME) {
		return undefined;
	}

	// AppPath.WalletConnect is '/wc/'; tolerate a missing trailing slash.
	const path = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;
	if (path !== AppPath.WalletConnect) {
		return undefined;
	}

	// URLSearchParams.get already percent-decodes the value.
	const uri = url.searchParams.get(URI_PARAM);
	if (isNullish(uri) || !uri.startsWith(WALLET_CONNECT_URI_PREFIX)) {
		return undefined;
	}

	return uri;
};
```

### 2. Wire it into `ScannerCode.svelte`

Replace the inline `wc:` prefix branch (and the local
`WALLET_CONNECT_URI_PREFIX` constant) with the util:

```ts
const walletConnectUri = extractWalletConnectUri(code);
if (nonNullish(walletConnectUri)) {
	onNext({ results: ScannerResults.WALLET_CONNECT, code: walletConnectUri });
	return;
}
```

The rest of `processCode` (trim → SOL → BTC → IC → OpenCryptoPay) is untouched.

### 3. Tests

- New `src/frontend/src/tests/lib/utils/scanner.utils.spec.ts` for
  `extractWalletConnectUri`: bare `wc:` passthrough; OISY `/wc/?uri=` URL (the
  example above) → inner `wc:`; percent-encoded `uri` decoded; `/wc` without
  trailing slash accepted; wrong host rejected; wrong path rejected; missing
  `uri` rejected; non-`wc:` `uri` rejected; non-URL garbage rejected. Build valid
  URLs from `OISY_URL_HOSTNAME` (imported from the constant) so the test is
  independent of the resolved domain.
- Extend `src/frontend/src/tests/lib/components/scanner/ScannerCode.spec.ts`:
  scanning an OISY `/wc/?uri=` URL calls `onNext` with `WALLET_CONNECT` and the
  **decoded inner** `wc:` URI; a non-OISY-host wrapper URL does **not** route to
  WalletConnect.

### 4. `PRODUCT.md`

Add a short note to the WalletConnect section that a pairing can be started by
scanning either a bare `wc:` URI or an OISY WalletConnect deep-link URL
(`<OISY host>/wc/?uri=…`), and that the URL form is only accepted for OISY's own
host.

---

## Open questions (facts to confirm)

None outstanding.

## Pending decisions (facts are clear — we just need to decide)

- **Domain scope — resolved.** Match the running environment's own
  `OISY_URL_HOSTNAME` (same-origin) rather than a fixed `oisy.com` allowlist. A
  consequence: scanning an `oisy.com` deep link on a staging / test build will
  not unwrap (the build only trusts its own host). Accepted as the more secure,
  environment-consistent default.
