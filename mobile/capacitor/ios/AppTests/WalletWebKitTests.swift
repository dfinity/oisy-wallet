import CryptoKit
import WebKit
import XCTest

@testable import App

@MainActor final class WalletWebKitTests: XCTestCase {
  private func waitForOfflineRetry(
    _ web: WKWebView, wallet: TrustedWalletViewController, replacing document: UUID? = nil,
    excludingPageNonce previousNonce: String? = nil
  ) async throws -> String {
    for _ in 0..<400 {
      if wallet.session.grant != nil,
        document == nil || wallet.session.documentID != document
      {
        let pageNonce =
          (try? await web.evaluateJavaScript(
            "window.testNetworkReads > 0 && document.querySelector('[data-tid=mobile-session-retry]') ? window.testDocumentNonce : ''"
          )) as? String ?? ""
        if !pageNonce.isEmpty, pageNonce != previousNonce { return pageNonce }
      }
      try await Task.sleep(for: .milliseconds(100))
    }
    XCTFail("An offline SDK mint must show the shared Retry screen")
    throw NSError(domain: "WalletWebKitTests.offlineRecovery", code: 1)
  }

  func testOfflineMintRetryReplacesDocumentWithoutEndingNativeSession() async throws {
    let store = TestAuthStore()
    // A random account cannot use the seed7 UI-test minter. This exercises the
    // real SDK mint failure while every network request is rejected locally.
    let native = try fixtureSession(key: .init(), expiry: .now.addingTimeInterval(3600))
    try store.save(native)
    let shell = ShellViewController(auth: AuthModel(store: store))
    shell.walletTestSource = WalletTestResources.source()
    shell.walletBootstrapScript = """
      window.testNetworkReads = 0;
      window.testDocumentNonce = crypto.randomUUID();
      window.fetch = () => {
        window.testNetworkReads++;
        return Promise.reject(new TypeError('offline'));
      };
      const OriginalWorker = window.Worker;
      window.Worker = class extends OriginalWorker {
        constructor(script, options) {
          const workerURL = new URL(script, location.href).href;
          const source = `
            globalThis.fetch = () => Promise.reject(new TypeError('offline'));
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
        }
      };
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
    let firstPageNonce = try await waitForOfflineRetry(web, wallet: wallet)
    let retryFits = try await web.evaluateJavaScript("""
      (() => {
        const button = document.querySelector('[data-tid=mobile-session-retry]');
        const rect = button.getBoundingClientRect();
        const banner = document.querySelector('.test-banner');
        const bannerRect = banner?.getBoundingClientRect();
        return rect.height >= 40 && rect.height <= 80 && rect.width >= 200
          && rect.bottom <= innerHeight
          && (!bannerRect || (bannerRect.top >= 40 && bannerRect.bottom < rect.top));
      })()
      """) as? Bool
    XCTAssertEqual(retryFits, true, "Recovery controls must fit the safe viewport without stretching")
    for (theme, style) in [("light", UIUserInterfaceStyle.light), ("dark", .dark)] {
      window.overrideUserInterfaceStyle = style
      _ = try await web.callAsyncJavaScript(
        """
        document.documentElement.setAttribute('theme', theme);
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return true;
        """, arguments: ["theme": theme], in: nil, contentWorld: .page)
      // Wait for WebKit's composited text and theme layers before capturing UIKit.
      try await Task.sleep(for: .milliseconds(200))
      let capture = XCTAttachment(image: UIGraphicsImageRenderer(bounds: window.bounds).image { _ in
        window.drawHierarchy(in: window.bounds, afterScreenUpdates: true)
      })
      capture.name = "wallet-recovery-\(theme)"
      capture.lifetime = .keepAlways
      add(capture)
    }
    let firstDocument = wallet.session.documentID
    let firstGrant = try XCTUnwrap(wallet.session.grant)
    XCTAssertEqual(shell.auth.session, native)
    XCTAssertEqual(store.signOutCalls, 0)
    XCTAssertNil(shell.browser.provider.account)

    _ = try await web.evaluateJavaScript(
      "document.querySelector('[data-tid=mobile-session-retry]').click(); true")
    let secondPageNonce = try await waitForOfflineRetry(
      web, wallet: wallet, replacing: firstDocument, excludingPageNonce: firstPageNonce)
    let secondGrant = try XCTUnwrap(wallet.session.grant)
    XCTAssertTrue(shell.wallet === wallet, "Retry must reload the trusted document, not sign out")
    XCTAssertNotEqual(wallet.session.documentID, firstDocument)
    XCTAssertNotEqual(secondPageNonce, firstPageNonce)
    XCTAssertNotEqual(secondGrant.id, firstGrant.id)
    XCTAssertNotEqual(
      secondGrant.chain.delegations.last?.delegation.pubkey,
      firstGrant.chain.delegations.last?.delegation.pubkey)
    XCTAssertEqual(secondGrant.expiresAt, firstGrant.expiresAt)
    XCTAssertEqual(shell.auth.session, native)
    XCTAssertEqual(shell.auth.session?.expiresAt, native.expiresAt)
    XCTAssertEqual(store.signOutCalls, 0)
    XCTAssertNil(shell.browser.provider.account)
  }

  func testSDKBootstrapRemainsIsolatedWhileMintIsOfflineAndClosesOnExpiry() async throws {
    let store = TestAuthStore()
    let native = try fixtureSession(key: .init(), expiry: .now.addingTimeInterval(3600))
    try store.save(native)
    let shell = ShellViewController(auth: AuthModel(store: store))
    shell.walletTestSource = WalletTestResources.source()
    // A synthetic native chain cannot mint a certified II app delegation. Leave
    // that real request pending rather than inventing a successful signed response.
    shell.walletBootstrapScript = """
      window.testNetworkReads = 0;
      window.fetch = () => { window.testNetworkReads++; return new Promise(() => {}); };
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
      previous?.makeKey()
    }
    let wallet = try XCTUnwrap(shell.wallet)
    let web = try XCTUnwrap(wallet.webView)
    for _ in 0..<200 where wallet.session.grant == nil {
      try await Task.sleep(for: .milliseconds(100))
    }
    let grant = try XCTUnwrap(
      wallet.session.grant, "Shared wallet must request the SDK session before loading private data"
    )
    XCTAssertEqual(grant.version, 1)
    XCTAssertEqual(grant.principal, native.principal)
    XCTAssertEqual(grant.chain.delegations.last?.delegation.pubkey.count, 182)
    XCTAssertEqual(grant.chain.delegations.last?.delegation.targets?.count, 1)
    var reads = 0
    for _ in 0..<100 where reads == 0 {
      reads = (try await web.evaluateJavaScript("window.testNetworkReads")) as? Int ?? 0
      if reads == 0 { try await Task.sleep(for: .milliseconds(100)) }
    }
    XCTAssertGreaterThan(reads, 0)
    XCTAssertNil(
      shell.browser.provider.account, "Unverified bootstrap cannot publish an Explore account")
    shell.showExplore()
    XCTAssertTrue(wallet.view.isHidden)
    shell.select(.wallet)
    XCTAssertTrue(wallet.session.checkExpiration(now: native.expiresAt))
    shell.resume()
    for _ in 0..<10 { await Task.yield() }
    XCTAssertNil(shell.auth.session)
    XCTAssertNil(shell.wallet)
    XCTAssertTrue(shell.auth.showsWelcomeBack)
  }
}
