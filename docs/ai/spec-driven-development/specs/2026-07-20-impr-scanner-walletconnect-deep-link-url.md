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

### Wrong-domain error

When the scanned code is a **well-formed** OISY WalletConnect deep-link URL
(path `/wc/`, `uri` param is a `wc:` URI) but its host is **not** the running
environment's OISY host, the pairing content is valid — only the domain is off.
Rather than the generic "Code/link is not valid" message, the scanner shows a
dedicated error, `scanner.error.link_domain_mismatch` ("This link is for a
different domain"), and does not pair. This uses the same surfaces as the
existing invalid-code error: an inline input error on desktop, a transient
banner on mobile.

### Negative guarantees (what it does _not_ do)

- **Does not** unwrap a `uri` param from a non-OISY host. A URL like
  `https://evil.example/wc/?uri=wc:...` is **not** paired; a well-formed one
  surfaces the [wrong-domain error](#wrong-domain-error) above, and anything not
  matching the `/wc/?uri=<wc: uri>` shape falls through to the existing handlers
  (and ultimately the invalid-code path), exactly as today.
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
scanner. It returns a small discriminated result so the caller can tell a usable
URI apart from a valid-but-wrong-domain deep link:

```ts
import { OISY_URL_HOSTNAME } from '$lib/constants/oisy.constants';
import { AppPath, URI_PARAM } from '$lib/constants/routes.constants';
import { isNullish } from '@dfinity/utils';

const WALLET_CONNECT_URI_PREFIX = 'wc:';

export type ScannedWalletConnectUri = { type: 'uri'; uri: string } | { type: 'wrong-domain' };

export const extractWalletConnectUri = (code: string): ScannedWalletConnectUri | undefined => {
	if (code.startsWith(WALLET_CONNECT_URI_PREFIX)) {
		return { type: 'uri', uri: code };
	}

	let url: URL;
	try {
		url = new URL(code);
	} catch (_: unknown) {
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

	if (url.hostname !== OISY_URL_HOSTNAME) {
		return { type: 'wrong-domain' };
	}

	return { type: 'uri', uri };
};
```

The host check moves **after** the path / `uri` checks so that a well-formed
deep link on the wrong host resolves to `wrong-domain` (rather than `undefined`,
which would fall through to the invalid-code path).

### 2. Wire it into `ScannerCode.svelte`

Replace the inline `wc:` prefix branch (and the local
`WALLET_CONNECT_URI_PREFIX` constant) with the util, handling the wrong-domain
outcome with the dedicated error:

```ts
const walletConnect = extractWalletConnectUri(code);
if (nonNullish(walletConnect)) {
	if (walletConnect.type === 'wrong-domain') {
		showError($i18n.scanner.error.link_domain_mismatch);
		return;
	}

	onNext({ results: ScannerResults.WALLET_CONNECT, code: walletConnect.uri });
	return;
}
```

`showError` is a small helper that routes a message to the right surface (mobile
banner vs. desktop inline error) — the same logic the OpenCryptoPay `catch`
already used inline, now shared. The mobile banner state changes from a boolean
(`showMobileError`) to a message string (`mobileError`) so it can carry either
error text. The rest of `processCode` (trim → SOL → BTC → IC → OpenCryptoPay) is
untouched.

### 3. i18n

Add `scanner.error.link_domain_mismatch` to `src/frontend/src/lib/i18n/en.json`
("This link is for a different domain") and run `npm run i18n` to sync the key
structure across the other locales (empty placeholders, per the repo's
sync-only workflow) and regenerate `i18n.d.ts`.

### 4. Tests

- New `src/frontend/src/tests/lib/utils/scanner.utils.spec.ts` for
  `extractWalletConnectUri`: bare `wc:` passthrough; OISY `/wc/?uri=` URL (the
  example above) → inner `wc:`; percent-encoded `uri` decoded; `/wc` without
  trailing slash accepted; wrong host → `wrong-domain`; wrong path rejected;
  missing `uri` rejected; non-`wc:` `uri` rejected; non-URL garbage rejected.
  Build valid URLs from `OISY_URL_HOSTNAME` (imported from the constant) so the
  test is independent of the resolved domain.
- Extend `src/frontend/src/tests/lib/components/scanner/ScannerCode.spec.ts`:
  scanning an OISY `/wc/?uri=` URL calls `onNext` with `WALLET_CONNECT` and the
  **decoded inner** `wc:` URI; a non-OISY-host wrapper URL shows
  `scanner.error.link_domain_mismatch` and does **not** route to WalletConnect
  or call OpenCryptoPay.

### 5. `PRODUCT.md`

Add a short note to the WalletConnect section that a pairing can be started by
scanning either a bare `wc:` URI or an OISY WalletConnect deep-link URL
(`<OISY host>/wc/?uri=…`), that the URL form is only accepted for OISY's own
host, and that a valid deep link on a different host shows a dedicated
domain-mismatch error.

---

## Open questions (facts to confirm)

None outstanding.

## Pending decisions (facts are clear — we just need to decide)

- **Domain scope — resolved.** Match the running environment's own
  `OISY_URL_HOSTNAME` (same-origin) rather than a fixed `oisy.com` allowlist. A
  consequence: scanning an `oisy.com` deep link on a staging / test build will
  not unwrap (the build only trusts its own host). Accepted as the more secure,
  environment-consistent default.
