---
title: HTTPS callback security probe
tags: [mobile, authentication, security, testing]
---

# HTTPS callback security probe

A separate iOS test app with bundle ID `org.dfinity.oisy.callbackcheck.artem` and
no Associated Domains entitlement by default. A second build uses
`ClaimedDomains.entitlements` to claim audit without being listed by its association
file. It loads only the audit callback with a fixed
synthetic fragment. It never opens II, requests a delegation, or uses wallet keys.
Do not add its identifier to audit's association file.

## Checks

- `--https`: starts a system authentication session for audit's HTTPS callback.
  Pass only when iOS reports that the app is not associated with the domain and
  returns no callback URL. A generic cancellation or an empty result is inconclusive.
- `--page`: loads the callback in an isolated WebView. Pass only when the fragment
  and query are discarded and no legacy return link is present. Navigation outside
  the callback is blocked and reported as a failure.

These checks cover the platform gate and the fallback page. They do not prove
resistance to every malicious browser or compromised-device scenario. Real OISY
sign-in needs a separate user-approved passkey test and an account-continuity check.

## Run

Generate the throwaway project outside the repository:

```sh
mkdir -p /tmp/oisy-callback-probe
cp mobile/capacitor/auth-handoff/callback-probe/CallbackProbe.swift /tmp/oisy-callback-probe/
xcodegen generate --spec mobile/capacitor/auth-handoff/callback-probe/project.yml \
  --project /tmp/oisy-callback-probe
xcodebuild -project /tmp/oisy-callback-probe/CallbackProbe.xcodeproj \
  -scheme CallbackProbe -destination 'generic/platform=iOS' \
  -derivedDataPath /tmp/oisy-callback-probe-build -allowProvisioningUpdates build
```

For the stronger negative case, rebuild with
`CODE_SIGN_ENTITLEMENTS` set to the absolute path of `ClaimedDomains.entitlements`.
This app claims the domain, but audit must still exclude its bundle ID. Do not
change the website association file to make the test pass.

Inspect the signed app with `codesign -d --entitlements -` and confirm the probe
bundle identifier. Check that `com.apple.developer.associated-domains` is absent
in the default build and contains audit's two services in the claimed-domain build. Install
it alongside OISY, then launch with `--https` or `--page`. The two buttons run the
same checks. Logs use `OISY_CALLBACK_PROBE` and never print a response URL. Remove
the test app after verification; do not uninstall OISY.

## Verification

On November 10, 2026:

- The signed no-entitlement build was installed on the connected iPhone. iOS
  returned no callback and reported AuthenticationServices error 1, explicitly
  stating that `org.dfinity.oisy.callbackcheck.artem` is not associated with
  `audit.oisy.com` and that HTTPS callbacks require `webcredentials`.
- The frontend callback, audit asset/configuration and session suite passed
  39 tests. The app's simulator auth/session suite passed 14 tests. Svelte checks
  reported no errors or warnings.
- The second signed build included both `applinks:audit.oisy.com` and
  `webcredentials:audit.oisy.com`. Inspection confirmed those entitlements in the
  signed binary. Audit did not list the probe's bundle ID. iOS again returned
  the explicit association error and no callback. Claiming the domain in an app
  does not substitute for authorization by the domain.
- Before deployment, the iPhone WebKit check detected the legacy return link
  using the fixed synthetic fragment. After deployment it reported
  `PASS_PAGE_DISCARDS_RESPONSE`: the fragment was cleared and the link was absent.
- [Audit deployment 42817051415](https://github.com/dfinity/oisy-wallet/actions/runs/42817051415)
  successfully deployed fix `2c2fb1603f`. A public-asset check examined all 23
  reachable JavaScript files: the relay was absent, the mobile host remained,
  and UI test fixtures were absent. The Apple association and II callback allowlist
  were unchanged; the probe remained unlisted.
- Lint, formatting and documentation-link checks passed. The temporary probe was
  removed and the existing OISY app reopened without reinstalling or clearing it.
- After deployment, the user completed a fresh Internet Identity sign-in in
  the existing OISY app and confirmed that Wallet opened and the ICP quantity
  matched. No OISY reinstall was needed.

A generic cancellation is not an association rejection; a simulator pass does
not replace a signed-device check. These results verify the tested callback paths,
not every possible malicious-browser or compromised-device scenario.

## Dependencies

| Document                                           | Purpose                                    |
| -------------------------------------------------- | ------------------------------------------ |
| [Session boundary](../../docs/session-boundary.md) | Callback ownership and credential handling |
