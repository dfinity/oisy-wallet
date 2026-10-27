import CryptoKit
import SwiftUI
import WebKit
import XCTest

@testable import App

@MainActor final class WalletWebKitTests: XCTestCase {
  private func evaluate(_ view: WKWebView, _ source: String) async throws -> String {
    let value = try await view.callAsyncJavaScript(
      source, arguments: [:], in: nil, contentWorld: .page)
    return try XCTUnwrap(value as? String, "Expected string from: " + source)
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
  func testRealWebWalletExploreAndExpiry() async throws {
    let store = KeychainStore(service: "oisy.capacitor.webkit.\(UUID())")
    defer { try? store.clear() }
    let native = try fixtureSession(
      key: Curve25519.Signing.PrivateKey(), expiry: .now.addingTimeInterval(3600))
    try store.save(native)
    let shell = ShellViewController(auth: AuthModel(store: store))
    shell.walletBootstrapScript = """
      window.testNetworkReads = 0;
      window.fetch = () => { window.testNetworkReads++; return Promise.reject(new Error('Offline fixture')); };
      window.testAuthWorkerReady = false;
      const OriginalWorker = window.Worker;
      window.Worker = class extends OriginalWorker {
        constructor(...args) {
          super(...args);
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
    XCTAssertFalse(web.scrollView.bounces)
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
    shell.select(.search)
    try await Task.sleep(for: .milliseconds(400))
    let searchDestination = try await evaluate(
      web, "return location.search.includes('search=true') ? 'search' : '';")
    XCTAssertEqual(searchDestination, "search")
    shell.select(.activity)
    try await Task.sleep(for: .milliseconds(400))
    XCTAssertTrue(web === shell.wallet?.webView)
    let activityDestination = try await evaluate(
      web, "return location.pathname;")
    XCTAssertEqual(activityDestination, "/activity/")
    XCTAssertTrue(wallet.session.grant?.id == grantID, "Client routing must preserve the session")
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
    XCTAssertFalse(tabs.isHidden)
    for (style, name) in [(UIUserInterfaceStyle.light, "light"), (.dark, "dark")] {
      window.overrideUserInterfaceStyle = style
      try await Task.sleep(for: .milliseconds(500))
      capture(window, name: "capacitor-notes-page-" + name)
    }
    // The real shared editor opens full screen; Cancel never persists this draft.
    _ = try await evaluate(
      web,
      """
      document.querySelector('[data-tid=notes-add-button]').click();
      return 'opened';
      """)
    try await Task.sleep(for: .milliseconds(600))
    XCTAssertTrue(tabs.isHidden)
    XCTAssertTrue(navigationMore.isHidden)
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
    try await Task.sleep(for: .milliseconds(400))
    capture(window, name: "capacitor-notes-editor-dark")
    _ = try await evaluate(
      web, "document.querySelector('[data-tid=notes-cancel-button]').click(); return 'cancelled';")
    try await Task.sleep(for: .milliseconds(500))
    XCTAssertFalse(tabs.isHidden)
    XCTAssertFalse(navigationMore.isHidden)
    // Shared Contacts exercises the common sheet with the same live bridge.
    wallet.hostPlugin.select("contacts")
    try await Task.sleep(for: .milliseconds(800))
    XCTAssertTrue(tabs.isHidden)
    let sheetBounds = try await evaluate(
      web,
      """
      const modal = document.querySelector('[data-tid=address-book-modal]');
      const bounds = modal.getBoundingClientRect();
      const panel = modal.querySelector('.wrapper').getBoundingClientRect();
      const close = modal.querySelector('[data-tid=modal-dismiss]');
      const toolbar = close?.closest('[data-modal-toolbar]');
      return String(bounds.top === 0 && Math.abs(bounds.bottom - innerHeight) < 1
        && Math.abs(panel.bottom - innerHeight) < 1 && panel.top > 0
        && (!toolbar || getComputedStyle(toolbar).display === 'none'));
      """)
    XCTAssertEqual(
      sheetBounds, "true", "Backdrop must cover the viewport; the sheet must reach its bottom")
    for (style, name) in [(UIUserInterfaceStyle.light, "light"), (.dark, "dark")] {
      window.overrideUserInterfaceStyle = style
      try await Task.sleep(for: .milliseconds(400))
      capture(window, name: "capacitor-shared-sheet-" + name)
    }
    for payload in [
      "{version: 3, blocking: false}", "{version: 2, blocking: 'false'}",
      "{version: 2, blocking: false, url: 'https://evil.test'}",
    ] {
      let rejected = try await evaluate(
        web,
        """
        try { await window.Capacitor.Plugins.OisyHost.presentation(\(payload)); return 'accepted'; }
        catch { return 'rejected'; }
        """)
      XCTAssertEqual(rejected, "rejected")
      XCTAssertTrue(tabs.isHidden)
    }
    _ = try await evaluate(
      web, "document.querySelector('[data-tid=close-modal]').click(); return 'closed';")
    try await Task.sleep(for: .milliseconds(500))
    XCTAssertFalse(tabs.isHidden)
    shell.select(.wallet)
    try await Task.sleep(for: .milliseconds(300))
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
    XCTAssertNil(try store.load())
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
