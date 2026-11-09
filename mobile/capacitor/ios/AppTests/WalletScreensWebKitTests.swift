import CryptoKit
import SwiftUI
import WebKit
import XCTest

@testable import App

@MainActor final class WalletScreensWebKitTests: XCTestCase {
  private func evaluate(_ view: WKWebView, _ source: String) async throws -> String {
    let value = try await view.callAsyncJavaScript(
      source, arguments: [:], in: nil, contentWorld: .page)
    return try XCTUnwrap(value as? String, "Expected string from: " + source)
  }
  private func waitFor(_ view: WKWebView, _ condition: String) async throws {
    var ready = "false"
    for _ in 0..<100 {
      ready = (try? await evaluate(view, "return String(\(condition));")) ?? "false"
      if ready == "true" { break }
      try await Task.sleep(for: .milliseconds(100))
    }
    XCTAssertEqual(ready, "true", "Timed out waiting for: " + condition)
    // Let native acknowledgement and the shared list's coalesced render finish.
    try await Task.sleep(for: .milliseconds(200))
  }
  private func waitForNativeSheet(_ shell: ShellViewController, visible: Bool) async throws {
    for _ in 0..<60 {
      let coordinator = shell.wallet?.nativeSheet
      if visible {
        if let panel = coordinator?.controller, panel.presentingViewController != nil,
          !panel.isBeingPresented
        {
          return
        }
      } else if coordinator?.identifier == nil {
        return
      }
      try await Task.sleep(for: .milliseconds(50))
    }
    XCTFail("Native sheet did not finish presentation or release")
  }
  private func capture(_ window: UIWindow, name: String) {
    let attachment = XCTAttachment(
      image: UIGraphicsImageRenderer(bounds: window.bounds).image { _ in
        window.drawHierarchy(in: window.bounds, afterScreenUpdates: true)
      })
    attachment.name = name
    attachment.lifetime = .keepAlways
    add(attachment)
  }
  private func verifySharedSwapForm(
    _ web: WKWebView, shell: ShellViewController, window: UIWindow
  ) async throws {
    let tabs = try XCTUnwrap(shell.view.subviews.compactMap { $0 as? UITabBar }.first)
    let interactions = try XCTUnwrap(shell.wallet?.interactions)
    let tokenURL = web.url
    try await waitFor(web, "!!document.querySelector('[data-tid=swap-tokens-modal-open-button]')")
    _ = try await evaluate(
      web,
      "document.querySelector('[data-tid=swap-tokens-modal-open-button]').click(); return 'opened';"
    )
    try await waitFor(web, "!!document.querySelector('[data-tid=swap-tokens-modal]')")
    let preview = try await evaluate(
      web,
      """
      const modal = document.querySelector('[data-tid=swap-tokens-modal]');
      return String(modal.textContent.includes('Swap')
        && !modal.textContent.includes('Swapping in the app is not available yet.'));
      """)
    XCTAssertNil(shell.wallet?.nativeSheet?.identifier, "Primary flows must be pages, not sheets")
    XCTAssertTrue(web.superview === shell.wallet?.view)
    XCTAssertEqual(preview, "true")
    XCTAssertTrue(tabs.isHidden)
    XCTAssertFalse(interactions.canBeginBack)
    XCTAssertFalse(interactions.refreshControl.isEnabled)
    for (style, name) in [(UIUserInterfaceStyle.light, "light"), (.dark, "dark")] {
      window.overrideUserInterfaceStyle = style
      try await Task.sleep(for: .milliseconds(400))
      capture(window, name: "capacitor-icp-swap-" + name)
    }
    _ = try await evaluate(
      web,
      "document.querySelector('[data-tid=swap-tokens-modal] [data-tid=close-modal]').click(); return 'closed';"
    )
    try await waitFor(web, "!document.querySelector('[data-tid=swap-tokens-modal]')")
    try await waitForNativeSheet(shell, visible: false)
    XCTAssertFalse(tabs.isHidden)
    XCTAssertEqual(web.url, tokenURL)
  }

  private func verifySharedICPSendReviewAndCancellation(
    _ web: WKWebView, shell: ShellViewController, window: UIWindow
  ) async throws {
    let tabs = try XCTUnwrap(shell.view.subviews.compactMap { $0 as? UITabBar }.first)
    let more = try XCTUnwrap(shell.view.subviews.compactMap { $0 as? UIButton }.first)
    let interactions = try XCTUnwrap(shell.wallet?.interactions)
    let tokenURL = web.url
    let recipient = "xlmdg-vkosz-ceopx-7wtgu-g3xmd-koiyc-awqaq-7modz-zf6r6-364rh-oqe"
    try await waitFor(web, "!!document.querySelector('[data-tid=send-tokens-modal-open-button]')")
    _ = try await evaluate(
      web,
      "document.querySelector('[data-tid=send-tokens-modal-open-button]').click(); return 'opened';"
    )
    try await waitFor(
      web,
      "!!document.querySelector('[data-tid=send-tokens-modal] input[data-tid=destination-input]')"
    )
    XCTAssertNil(shell.wallet?.nativeSheet?.identifier, "Primary flows must be pages, not sheets")
    XCTAssertTrue(web.superview === shell.wallet?.view)
    XCTAssertTrue(tabs.isHidden, "The shared Send sheet must hide native tabs")
    XCTAssertTrue(more.isHidden)
    XCTAssertFalse(interactions.canBeginBack, "An edge swipe must not leave an open Send flow")
    XCTAssertFalse(interactions.refreshControl.isEnabled)

    // Exercise the real destination validation: an Ethereum address cannot
    // accidentally select a ck withdrawal in this ICP-only Send slice.
    _ = try await evaluate(
      web,
      """
      const input = document.querySelector('[data-tid=send-tokens-modal] input[data-tid=destination-input]');
      input.value = '0xF2777205439a8c7be0425cbb21D8DB7426Df5DE9';
      input.dispatchEvent(new Event('input', {bubbles: true}));
      return 'entered';
      """)
    try await waitFor(
      web,
      "document.querySelector('[data-tid=send-form-destination-next-button]')?.disabled === true"
    )
    _ = try await evaluate(
      web,
      """
      const input = document.querySelector('[data-tid=send-tokens-modal] input[data-tid=destination-input]');
      input.value = '\(recipient)'; input.dispatchEvent(new Event('input', {bubbles: true})); input.blur();
      return 'entered';
      """)
    try await waitFor(
      web,
      "document.querySelector('[data-tid=send-form-destination-next-button]')?.disabled === false"
    )
    _ = try await evaluate(
      web,
      "document.querySelector('[data-tid=send-form-destination-next-button]').click(); return 'next';"
    )
    try await waitFor(
      web,
      "!!document.querySelector('[data-tid=send-tokens-modal] input[data-tid=token-input-currency-token]')"
    )
    _ = try await evaluate(
      web,
      """
      const input = document.querySelector('[data-tid=send-tokens-modal] input[data-tid=token-input-currency-token]');
      input.value = '0.125'; input.dispatchEvent(new Event('input', {bubbles: true})); input.blur();
      return 'entered';
      """)
    window.endEditing(true)
    try await waitFor(
      web, "document.querySelector('[data-tid=send-form-next-button]')?.disabled === false")
    _ = try await evaluate(
      web, "document.querySelector('[data-tid=send-form-next-button]').click(); return 'review';")
    try await waitFor(web, "!!document.querySelector('[data-tid=review-form-send-button]')")
    let review = try await evaluate(
      web,
      """
      const modal = document.querySelector('[data-tid=send-tokens-modal]');
      const text = modal.textContent.replace(/\\s+/g, ' ');
      const button = modal.querySelector('[data-tid=review-form-send-button]');
      return String(text.includes('0.125 ICP') && text.includes('\(recipient)')
        && text.includes('0.0001') && !!button?.disabled
        && !!modal.querySelector('[data-tid=send-first-time-destination-confirm]'));
      """)
    XCTAssertEqual(review, "true", "Review must show ICP, its fee, recipient and confirmation")
    // Acknowledge the recipient, but never invoke the final Send action. Both
    // the wallet and worker fetch functions remain blocked by this test harness.
    _ = try await evaluate(
      web,
      "document.querySelector('[data-tid=send-first-time-destination-confirm]').click(); return 'acknowledged';"
    )
    try await waitFor(
      web, "document.querySelector('[data-tid=review-form-send-button]')?.disabled === false")
    for (style, name) in [(UIUserInterfaceStyle.light, "light"), (.dark, "dark")] {
      window.overrideUserInterfaceStyle = style
      try await Task.sleep(for: .milliseconds(400))
      capture(window, name: "capacitor-icp-send-review-" + name)
    }
    XCTAssertTrue(tabs.isHidden)
    XCTAssertTrue(more.isHidden)
    XCTAssertFalse(interactions.canBeginBack)
    XCTAssertEqual(web.url, tokenURL, "Review must stay inside the token's shared modal")

    _ = try await evaluate(
      web, "document.documentElement.style.fontSize = '130%'; return 'scaled';")
    try await Task.sleep(for: .milliseconds(300))
    let largeText = try await evaluate(
      web,
      """
      const button = document.querySelector('[data-tid=review-form-send-button]').getBoundingClientRect();
      return String(button.top >= 0 && button.bottom <= innerHeight && button.right <= innerWidth);
      """)
    XCTAssertEqual(largeText, "true", "Review actions must remain reachable with enlarged web text")
    capture(window, name: "send-page-enlarged-text")
    _ = try await evaluate(web, "document.documentElement.style.fontSize = ''; return 'restored';")
    try await Task.sleep(for: .milliseconds(300))

    // Back preserves the draft; Cancel discards it and restores native controls.
    _ = try await evaluate(
      web,
      "document.querySelector('[data-tid=send-tokens-modal] [data-tid=toolbar] button').click(); return 'back';"
    )
    try await waitFor(
      web,
      "document.querySelector('[data-tid=send-tokens-modal] input[data-tid=token-input-currency-token]')?.value === '0.125'"
    )
    _ = try await evaluate(
      web,
      "document.querySelector('[data-tid=send-tokens-modal] [data-tid=toolbar] button').click(); return 'back';"
    )
    try await waitFor(
      web,
      "document.querySelector('[data-tid=send-tokens-modal] input[data-tid=destination-input]')?.value === '\(recipient)'"
    )
    _ = try await evaluate(
      web,
      "document.querySelector('[data-tid=send-form-destination-next-button]').previousElementSibling.click(); return 'cancelled';"
    )
    try await waitFor(web, "!document.querySelector('[data-tid=send-tokens-modal]')")
    try await waitForNativeSheet(shell, visible: false)
    XCTAssertFalse(tabs.isHidden)
    XCTAssertFalse(more.isHidden)
    XCTAssertTrue(shell.walletInteractionsAllowed)
    XCTAssertEqual(web.url, tokenURL)

    _ = try await evaluate(
      web,
      "document.querySelector('[data-tid=send-tokens-modal-open-button]').click(); return 'reopened';"
    )
    try await waitFor(
      web,
      "document.querySelector('[data-tid=send-tokens-modal] input[data-tid=destination-input]')?.value === ''"
    )
    _ = try await evaluate(
      web,
      "document.querySelector('[data-tid=send-tokens-modal] [data-tid=close-modal]').click(); return 'closed';"
    )
    try await waitFor(web, "!document.querySelector('[data-tid=send-tokens-modal]')")
    try await waitForNativeSheet(shell, visible: false)
    XCTAssertFalse(tabs.isHidden)
    XCTAssertFalse(more.isHidden)
    XCTAssertTrue(shell.walletInteractionsAllowed)
  }
  func testSharedWalletScreensAndExpiryWithOfflineSDKFixture() async throws {
    let store = TestAuthStore(service: "oisy.capacitor.webkit.\(UUID())")
    defer { try? store.clear() }
    // Public fixture account matching mobile-sdk-session.fixture.ts. The test-only
    // minter is excluded from phone builds; every real network request stays blocked.
    let account = try Curve25519.Signing.PrivateKey(
      rawRepresentation: Data(repeating: 7, count: 32))
    let native = try fixtureSession(
      key: Curve25519.Signing.PrivateKey(), expiry: .now.addingTimeInterval(3600), root: account)
    try store.save(native)
    let shell = ShellViewController(auth: AuthModel(store: store))
    shell.walletTestSource = WalletTestResources.source()
    shell.walletBootstrapScript = """
      window.testNetworkReads = 0;
      window.testDocumentNonce = crypto.randomUUID();
      // Keep real API paths pending: no network response is fabricated or certified.
      window.fetch = () => { window.testNetworkReads++; return new Promise(() => {}); };
      window.testAuthWorkerReady = false;
      const OriginalWorker = window.Worker;
      window.Worker = class extends OriginalWorker {
        constructor(script, options) {
          // Workers have separate globals. Block their network too, then load the
          // real bundled worker and replay the native-session handshake it received.
          const workerURL = new URL(script, location.href).href;
          const source = `
            globalThis.fetch = () => new Promise(() => {});
            const queued = [];
            const hold = event => { event.stopImmediatePropagation(); queued.push(event); };
            globalThis.addEventListener('message', hold);
            import(${JSON.stringify(workerURL)}).then(() => {
              globalThis.removeEventListener('message', hold);
              for (const event of queued) globalThis.dispatchEvent(new MessageEvent('message', {
                data: event.data, ports: event.ports
              }));
            });`;
          const wrapper = URL.createObjectURL(new Blob([source], {type: 'text/javascript'}));
          super(wrapper, options);
          this.addEventListener('message', ({data}) => {
            if (data?.msg === 'delegationRemainingTime') window.testAuthWorkerReady = true;
          });
        }
      };
      window.testErrors = [];
      window.addEventListener('unhandledrejection', e => window.testErrors.push(String(e.reason)));
      """
    let scene = try XCTUnwrap(UIApplication.shared.connectedScenes.first as? UIWindowScene)
    let previous = scene.keyWindow
    let window = UIWindow(windowScene: scene)
    window.rootViewController = shell
    window.makeKeyAndVisible()
    defer {
      shell.auth.signOut()
      shell.resume()
      window.isHidden = true
      window.rootViewController = nil
      previous?.makeKey()
    }
    let wallet = try XCTUnwrap(shell.wallet)
    let web = try XCTUnwrap(wallet.webView)
    var stage = ""
    for _ in 0..<500 {
      stage =
        (try? await evaluate(
          web,
          "return document.querySelector('[data-mobile-host]') && window.testAuthWorkerReady ? 'ready' : ''; "
        )) ?? ""
      if stage == "ready" { break }
      try await Task.sleep(for: .milliseconds(100))
    }
    XCTAssertEqual(
      stage, "ready",
      "Shared frontend and real auth worker must use the native session, even offline")
    _ = try await evaluate(
      web, "document.querySelector('.test-banner button')?.click(); return 'dismissed';")
    XCTAssertNotNil(wallet.session.grant)
    XCTAssertEqual(web.url?.scheme, "capacitor")
    XCTAssertFalse(web.configuration.websiteDataStore.isPersistent)
    for (style, name) in [(UIUserInterfaceStyle.light, "light"), (.dark, "dark")] {
      window.overrideUserInterfaceStyle = style
      try await Task.sleep(for: .seconds(2))
      let balanceVisible = try await evaluate(
        web,
        """
        const output = document.querySelector('article output');
        const rect = output?.getBoundingClientRect();
        const hidden = node => {
          if (!node) return false;
          const style = getComputedStyle(node);
          return style.opacity === '0' || style.visibility === 'hidden'
            || style.display === 'none' || hidden(node.parentElement);
        };
        return String(!!output?.textContent.trim() && rect?.height > 0 && !hidden(output));
        """)
      XCTAssertEqual(balanceVisible, "true", "Balance must remain visible in " + name)
      let webCapture = XCTAttachment(image: try await web.takeSnapshot(configuration: nil))
      webCapture.name = "capacitor-web-content-" + name
      webCapture.lifetime = .keepAlways
      add(webCapture)
      let shot = UIGraphicsImageRenderer(bounds: window.bounds).image { _ in
        window.drawHierarchy(in: window.bounds, afterScreenUpdates: true)
      }
      let capture = XCTAttachment(image: shot)
      capture.name = "capacitor-live-wallet-" + name
      capture.lifetime = .keepAlways
      add(capture)
    }
    let grantID = wallet.session.grant?.id
    let documentNonce = try await evaluate(web, "return window.testDocumentNonce;")
    try await waitFor(web, "document.documentElement.dataset.mobileNavigationFixture === 'ready'")
    _ = try await evaluate(
      web, "window.dispatchEvent(new Event('oisyTestNavigation')); return 'seeded';")
    try await waitFor(web, "!!document.querySelector('[data-tid=token-card-ICP-ICP]')")
    let interactions = try XCTUnwrap(wallet.interactions)
    let refreshCSS = try await evaluate(
      web,
      "return JSON.stringify({path: location.pathname, marker: !!document.querySelector('[data-mobile-refresh]'), html: getComputedStyle(document.documentElement).overscrollBehaviorY, body: getComputedStyle(document.body).overscrollBehaviorY});"
    )
    XCTAssertTrue(
      web.scrollView.bouncesVertically,
      "Refresh: enabled=\(interactions.refreshControl.isEnabled) allowed=\(shell.walletInteractionsAllowed) root=\(shell.walletRoot) legacy=\(shell.acceptsLegacyNavigation) css=\(refreshCSS)"
    )
    XCTAssertFalse(web.scrollView.bouncesHorizontally)
    interactions.refreshControl.beginRefreshing()
    XCTAssertTrue(interactions.refreshControl.isRefreshing)
    interactions.refreshControl.sendActions(for: .valueChanged)
    let refreshID = try XCTUnwrap(interactions.refreshRequestID)
    interactions.refreshControl.sendActions(for: .valueChanged)
    XCTAssertEqual(interactions.refreshRequestID, refreshID)
    XCTAssertEqual(wallet.session.grant?.id, grantID, "Refresh must keep its session")
    // Exercise the actual shared list and its actual token-row handler, not a
    // synthetic token page. The network ID is ICP; InternetComputer is a pay URI label.
    _ = try await evaluate(
      web,
      """
      window.testWalletScroll = Math.min(160, document.documentElement.scrollHeight - innerHeight);
      scrollTo(0, window.testWalletScroll);
      return 'scrolled';
      """)
    try await waitFor(
      web, "window.testWalletScroll > 0 && Math.abs(scrollY - window.testWalletScroll) < 2")
    let walletParent = web.url
    _ = try await evaluate(
      web, "document.querySelector('[data-tid=token-card-ICP-ICP]').click(); return 'opened';")
    try await waitFor(
      web,
      "location.pathname === '/transactions/' && new URLSearchParams(location.search).get('network') === 'ICP' && new URLSearchParams(location.search).get('token') === 'ryjl3-tyaaa-aaaaa-aaaba-cai'"
    )
    XCTAssertEqual(shell.walletRoot, .wallet)
    XCTAssertEqual(web.backForwardList.backItem?.url, walletParent)
    XCTAssertFalse(web.allowsBackForwardNavigationGestures)
    XCTAssertTrue(interactions.canBeginBack)
    XCTAssertNil(interactions.refreshRequestID, "Leaving Wallet cancels refresh")
    XCTAssertFalse(interactions.refreshControl.isRefreshing)
    XCTAssertFalse(web.scrollView.bouncesVertically)
    XCTAssertEqual(interactions.parentURL, walletParent)
    XCTAssertTrue(interactions.beginBack())
    interactions.updateBack(progress: 0.45)
    capture(window, name: "wallet-back-mid-gesture-correct-parent")
    interactions.endBack(commit: false, animated: false)
    XCTAssertEqual(
      web.url.flatMap { URLComponents(url: $0, resolvingAgainstBaseURL: false)?.path },
      "/transactions/", "Cancelling must not change route")
    XCTAssertEqual(web.transform, .identity)
    XCTAssertTrue(interactions.beginBack())
    interactions.updateBack(progress: 0.6)
    interactions.endBack(commit: true, animated: false)
    try await waitFor(web, "location.pathname === '/' && !location.search")
    try await waitFor(web, "Math.abs(scrollY - window.testWalletScroll) < 2")
    XCTAssertFalse(web.allowsBackForwardNavigationGestures)
    XCTAssertEqual(wallet.session.grant?.id, grantID)

    // Match the reported ETH-on-Base path: return into an expanded group at the
    // same scroll position, without a second height animation.
    _ = try await evaluate(
      web, "document.querySelector('[data-tid=token-group-ETH]').click(); return 'expanded';")
    try await waitFor(web, "!!document.querySelector('[data-tid=token-card-ETH-BASE]')")
    try await waitFor(
      web,
      "document.querySelector('[data-tid=token-group-ETH]').closest('.group-card').getAnimations({subtree: true}).filter(animation => animation.effect?.getTiming().iterations !== Infinity).every(animation => animation.playState === 'finished')"
    )
    _ = try await evaluate(
      web,
      """
      document.querySelector('[data-tid=token-card-ETH-BASE]').scrollIntoView({block: 'center'});
      window.testGroupScroll = scrollY;
      window.testGroupHeight = document.querySelector('[data-tid=token-group-ETH]').closest('.group-card').getBoundingClientRect().height;
      return 'positioned';
      """)
    _ = try await evaluate(
      web, "document.querySelector('[data-tid=token-card-ETH-BASE]').click(); return 'opened';")
    try await waitFor(
      web,
      "location.pathname === '/transactions/' && new URLSearchParams(location.search).get('network') === 'BASE'"
    )
    XCTAssertEqual(interactions.parentURL, walletParent)
    // The web route can commit before its presentation report enables native Back.
    for _ in 0..<50 {
      if interactions.canBeginBack { break }
      try await Task.sleep(for: .milliseconds(100))
    }
    XCTAssertTrue(interactions.beginBack())
    interactions.updateBack(progress: 0.55)
    capture(window, name: "eth-base-back-mid-gesture-expanded-wallet")
    interactions.endBack(commit: true, animated: false)
    try await waitFor(web, "location.pathname === '/' && !location.search")
    try await waitFor(
      web,
      "document.querySelector('[data-tid=token-group-ETH]').closest('.group-card').classList.contains('expanded') && Math.abs(scrollY - window.testGroupScroll) < 2 && Math.abs(document.querySelector('[data-tid=token-group-ETH]').closest('.group-card').getBoundingClientRect().height - window.testGroupHeight) < 2"
    )
    capture(window, name: "eth-base-back-restored-expanded-wallet")
    XCTAssertEqual(wallet.session.grant?.id, grantID)

    let rootsHistoryLength = try await evaluate(web, "return String(history.length);")
    shell.select(.search)
    try await waitFor(
      web,
      "location.pathname === '/' && location.search === '?search=true' && !!document.querySelector('[data-tid=token-list-filter-input]')"
    )
    XCTAssertFalse(web.scrollView.bouncesVertically, "Search never enables pull to refresh")
    let searchHistoryLength = try await evaluate(web, "return String(history.length);")
    XCTAssertEqual(
      searchHistoryLength, rootsHistoryLength, "Selecting Search must replace the root")
    _ = try await evaluate(
      web,
      """
      const input = document.querySelector('[data-tid=token-list-filter-input]');
      input.value = 'ICP'; input.dispatchEvent(new Event('input', {bubbles: true})); input.blur();
      return 'filtered';
      """)
    window.endEditing(true)
    try await waitFor(
      web,
      "document.querySelector('[data-tid=token-list-filter-input]')?.value === 'ICP' && !!document.querySelector('[data-tid=token-card-ICP-ICP]')"
    )
    let searchParent = web.url
    _ = try await evaluate(
      web, "document.querySelector('[data-tid=token-card-ICP-ICP]').click(); return 'opened';")
    try await waitFor(web, "location.pathname === '/transactions/'")
    XCTAssertEqual(shell.walletRoot, .search)
    XCTAssertEqual(web.backForwardList.backItem?.url, searchParent)
    XCTAssertFalse(web.allowsBackForwardNavigationGestures)
    // The committed route can paint before its asynchronous native state report arrives.
    for _ in 0..<40 {
      if interactions.canBeginBack { break }
      try await Task.sleep(for: .milliseconds(50))
    }
    XCTAssertTrue(interactions.canBeginBack, "Search detail must acknowledge its captured parent")
    XCTAssertFalse(interactions.refreshControl.isEnabled, "Search is not a refresh surface")
    XCTAssertEqual(wallet.session.grant?.id, grantID)

    // A blocking shared presentation must suspend both gesture eligibility and
    // the underlying Back action. The Contacts request acknowledges the same route.
    wallet.hostPlugin.select("contacts")
    try await waitFor(web, "!!document.querySelector('[data-tid=address-book-modal]')")
    XCTAssertFalse(web.allowsBackForwardNavigationGestures)
    XCTAssertFalse(interactions.canBeginBack)
    _ = try await evaluate(
      web,
      "document.querySelector('button[aria-label=\"Go back to the previous page\"]').click(); return 'blocked';"
    )
    web.goBack()
    try await Task.sleep(for: .milliseconds(600))
    let overlayLocation = try await evaluate(web, "return location.pathname;")
    XCTAssertEqual(
      overlayLocation, "/transactions/", "A blocking modal must prevent underlying Back")
    let overlayPresent = try await evaluate(
      web, "return String(!!document.querySelector('[data-tid=address-book-modal]'));")
    XCTAssertEqual(overlayPresent, "true")
    _ = try await evaluate(
      web,
      "document.querySelector('[data-tid=address-book-modal] [data-tid=close-modal]').click(); return 'closed';"
    )
    try await waitFor(web, "!document.querySelector('[data-tid=address-book-modal]')")
    try await waitForNativeSheet(shell, visible: false)
    XCTAssertFalse(web.allowsBackForwardNavigationGestures)
    XCTAssertTrue(interactions.canBeginBack)
    XCTAssertTrue(interactions.beginBack())
    interactions.updateBack(progress: 0.55)
    capture(window, name: "search-back-mid-gesture-correct-parent")
    interactions.endBack(commit: true, animated: false)
    try await waitFor(
      web,
      "location.pathname === '/' && location.search === '?search=true' && document.querySelector('[data-tid=token-list-filter-input]')?.value === 'ICP'"
    )
    XCTAssertEqual(shell.walletRoot, .search)
    XCTAssertFalse(web.allowsBackForwardNavigationGestures)
    _ = try await evaluate(
      web, "document.querySelector('button[aria-label=Sorting]').click(); return 'opened';")
    try await waitForNativeSheet(shell, visible: true)
    let accessory = try XCTUnwrap(wallet.nativeSheet)
    let accessoryPanel = try XCTUnwrap(accessory.controller)
    XCTAssertEqual(accessoryPanel.sheetPresentationController?.selectedDetentIdentifier, .medium)
    XCTAssertTrue(web.superview === accessoryPanel.view)
    for (style, name) in [(UIUserInterfaceStyle.light, "light"), (.dark, "dark")] {
      window.overrideUserInterfaceStyle = style
      try await Task.sleep(for: .milliseconds(400))
      capture(window, name: "native-sorting-sheet-" + name)
    }
    let accessoryPresentation = try XCTUnwrap(accessoryPanel.presentationController)
    XCTAssertFalse(accessory.presentationControllerShouldDismiss(accessoryPresentation))
    accessory.presentationControllerDidAttemptToDismiss(accessoryPresentation)
    try await waitFor(web, "!document.querySelector('[data-tid=bottom-sheet]')")
    try await waitForNativeSheet(shell, visible: false)
    XCTAssertTrue(web.superview === wallet.view)
    let nonceAfterBack = try await evaluate(web, "return window.testDocumentNonce;")
    XCTAssertEqual(nonceAfterBack, documentNonce, "Back must retain the wallet document")
    XCTAssertEqual(wallet.session.grant?.id, grantID, "Back must retain its native grant")

    let beforeTabHistoryLength = try await evaluate(web, "return String(history.length);")
    shell.select(.activity)
    try await waitFor(web, "location.pathname === '/activity/'")
    let afterTabHistoryLength = try await evaluate(web, "return String(history.length);")
    XCTAssertEqual(
      beforeTabHistoryLength, afterTabHistoryLength, "Tabs must not append browser history")
    XCTAssertEqual(shell.walletRoot, .activity)
    XCTAssertFalse(web.allowsBackForwardNavigationGestures)
    XCTAssertTrue(web === shell.wallet?.webView)
    XCTAssertEqual(wallet.session.grant?.id, grantID, "Client routing must preserve the session")
    let readCount = try await evaluate(web, "return String(window.testNetworkReads);")
    XCTAssertGreaterThan(
      Int(readCount) ?? 0, 0, "Normal shared loader must attempt its canister read")
    let errors = try await evaluate(web, "return JSON.stringify(window.testErrors);")
    XCTAssertEqual(errors, "[]")
    for (destination, path) in [(MoreDestination.earn, "/earn/"), (.borrow, "/borrow/")] {
      shell.openMore(destination)
      try await Task.sleep(for: .milliseconds(500))
      let actualPath = try await evaluate(web, "return location.pathname;")
      XCTAssertEqual(actualPath, path)
      XCTAssertTrue(web === shell.wallet?.webView)
      XCTAssertEqual(wallet.session.grant?.id, grantID)
    }
    // UI-test-only bundle seeds the shared cache; the phone bundle excludes it.
    _ = try await evaluate(
      web, "window.dispatchEvent(new Event('oisyTestEmptyNotes')); return 'seeded';")
    shell.openMore(.notes)
    var notesReady = ""
    for _ in 0..<100 {
      notesReady = try await evaluate(
        web, "return String(!!document.querySelector('[data-tid=notes-add-button]')); ")
      if notesReady == "true" { break }
      try await Task.sleep(for: .milliseconds(100))
    }
    XCTAssertEqual(notesReady, "true", "Build simulator fixtures with VITE_MOBILE_UI_TEST=true")
    _ = try await evaluate(
      web,
      "document.querySelectorAll('.toast [data-tid=close-button]').forEach(button => button.click()); return 'dismissed';"
    )
    try await Task.sleep(for: .milliseconds(300))
    let notesVisible = try await evaluate(
      web,
      """
      return String(location.pathname === '/notes/' && !!document.querySelector('[data-tid=notes-page]')
        && !document.querySelector('[aria-modal=true]') && !document.querySelector('[data-tid=modal-dismiss]'));
      """)
    XCTAssertEqual(
      notesVisible, "true", "More must open the shared Notes page without modal chrome")
    XCTAssertEqual(shell.walletRoot, .notes)
    let tabs = try XCTUnwrap(shell.view.subviews.compactMap { $0 as? UITabBar }.first)
    let navigationMore = try XCTUnwrap(shell.view.subviews.compactMap { $0 as? UIButton }.first)
    try await waitForNativeSheet(shell, visible: false)
    XCTAssertFalse(tabs.isHidden)
    for (style, name) in [(UIUserInterfaceStyle.light, "light"), (.dark, "dark")] {
      window.overrideUserInterfaceStyle = style
      try await Task.sleep(for: .milliseconds(500))
      capture(window, name: "capacitor-notes-page-" + name)
    }
    // The shared editor stays a full-screen page; Cancel never persists this draft.
    _ = try await evaluate(
      web,
      """
      document.querySelector('[data-tid=notes-add-button]').click();
      return 'opened';
      """)
    try await Task.sleep(for: .milliseconds(600))
    XCTAssertTrue(tabs.isHidden)
    XCTAssertTrue(navigationMore.isHidden)
    XCTAssertNil(wallet.nativeSheet?.identifier)
    let editor = try await evaluate(
      web,
      """
      const input = document.querySelector('[data-tid=notes-input]');
      input.value = 'Private simulator draft'; input.dispatchEvent(new Event('input', {bubbles: true}));
      const save = document.querySelector('[data-tid=notes-save-button]').getBoundingClientRect();
      return String(!!document.querySelector('[data-mobile-presentation=fullScreen]')
        && !document.querySelector('[data-tid=close-modal]') && save.top >= 0 && save.bottom < innerHeight);
      """)
    XCTAssertEqual(
      editor, "true", "Editor actions must remain inside the keyboard-adjusted viewport")
    _ = try await evaluate(
      web, "document.querySelector('[data-tid=notes-input]').focus(); return 'focused';")
    try await Task.sleep(for: .milliseconds(600))
    let keyboardLayout = try await evaluate(
      web,
      """
      const input = document.querySelector('[data-tid=notes-input]');
      const save = document.querySelector('[data-tid=notes-save-button]').getBoundingClientRect();
      return String(document.activeElement === input && save.top >= 0
        && save.bottom <= visualViewport.height + visualViewport.offsetTop);
      """)
    XCTAssertEqual(keyboardLayout, "true", "Editor controls must stay above the keyboard viewport")
    capture(window, name: "capacitor-notes-editor-dark")
    window.endEditing(true)
    _ = try await evaluate(
      web, "document.querySelector('[data-tid=notes-cancel-button]').click(); return 'cancelled';")
    try await Task.sleep(for: .milliseconds(500))
    try await waitForNativeSheet(shell, visible: false)
    XCTAssertFalse(tabs.isHidden)
    XCTAssertFalse(navigationMore.isHidden)
    // Contacts is a full-page flow using the same shared components/session.
    wallet.hostPlugin.select("contacts")
    try await Task.sleep(for: .milliseconds(800))
    XCTAssertTrue(tabs.isHidden)
    XCTAssertNil(wallet.nativeSheet?.identifier)
    let sheetBounds = try await evaluate(
      web,
      """
      const modal = document.querySelector('[data-tid=address-book-modal]');
      const bounds = modal.getBoundingClientRect();
      const panel = modal.querySelector('.wrapper').getBoundingClientRect();
      const close = modal.querySelector('[data-tid=modal-dismiss]');
      const toolbar = close?.closest('[data-modal-toolbar]');
      return String(bounds.top === 0 && Math.abs(bounds.bottom - innerHeight) < 1
        && Math.abs(panel.bottom - innerHeight) < 1 && Math.abs(panel.top) < 1
        && modal.dataset.mobilePresentation === 'fullScreen'
        && (!toolbar || getComputedStyle(toolbar).display === 'none'));
      """)
    XCTAssertEqual(
      sheetBounds, "true", "Contacts must fill the screen without a native sheet")
    for (style, name) in [(UIUserInterfaceStyle.light, "light"), (.dark, "dark")] {
      window.overrideUserInterfaceStyle = style
      try await Task.sleep(for: .milliseconds(400))
      capture(window, name: "contacts-page-" + name)
    }
    for payload in [
      "{version: 3, blocking: false}", "{version: 2, blocking: 'false'}",
      "{version: 2, blocking: false, url: 'https://evil.test'}",
    ] {
      let rejected = try await evaluate(
        web,
        """
        const {value: ready} = await window.__oisyHost.request('ready', {version: 2});
        try { await window.__oisyHost.request('presentation', {
          ...\(payload), documentId: ready.documentId
        }); return 'accepted'; }
        catch { return 'rejected'; }
        """)
      XCTAssertEqual(rejected, "rejected")
      XCTAssertTrue(tabs.isHidden)
    }
    _ = try await evaluate(
      web, "document.querySelector('[data-tid=close-modal]').click(); return 'closed';")
    try await Task.sleep(for: .milliseconds(500))
    try await waitForNativeSheet(shell, visible: false)
    XCTAssertFalse(tabs.isHidden)
    shell.select(.wallet)
    try await waitFor(
      web,
      "location.pathname === '/' && !location.search && !!document.querySelector('[data-tid=token-card-ICP-ICP]')"
    )
    _ = try await evaluate(
      web, "document.querySelector('[data-tid=token-card-ICP-ICP]').click(); return 'opened';")
    try await waitFor(web, "location.pathname === '/transactions/'")
    try await verifySharedICPSendReviewAndCancellation(web, shell: shell, window: window)
    try await verifySharedSwapForm(web, shell: shell, window: window)
    shell.select(.wallet)
    try await waitFor(web, "location.pathname === '/' && !location.search")
    let more = try XCTUnwrap(shell.view.subviews.compactMap { $0 as? UIButton }.first)
    more.performPrimaryAction()
    try await Task.sleep(for: .milliseconds(500))
    XCTAssertTrue(more.isHeld, "More must present the system popover")
    let menuCapture = XCTAttachment(
      image: UIGraphicsImageRenderer(bounds: window.bounds).image { _ in
        window.drawHierarchy(in: window.bounds, afterScreenUpdates: true)
      })
    menuCapture.name = "capacitor-more-popover"
    menuCapture.lifetime = .keepAlways
    add(menuCapture)
    let grant = try XCTUnwrap(wallet.session.grant)
    XCTAssertTrue(
      wallet.session.checkExpiration(now: Date(timeIntervalSince1970: grant.expiresAt / 1000)))
    XCTAssertNil(shell.wallet)
    XCTAssertNil(shell.auth.session)
    for _ in 0..<100 where shell.auth.isSigningIn { await Task.yield() }
    XCTAssertFalse(shell.auth.isSigningIn)
    XCTAssertNil(store.value)
    XCTAssertEqual(shell.walletRoot, .wallet)
    let capture = XCTAttachment(
      image: UIGraphicsImageRenderer(bounds: window.bounds).image { _ in
        window.drawHierarchy(in: window.bounds, afterScreenUpdates: true)
      })
    capture.name = "capacitor-expired-sign-in"
    capture.lifetime = .keepAlways
    add(capture)
  }
}
