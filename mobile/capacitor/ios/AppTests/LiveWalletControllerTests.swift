import WebKit
import XCTest

@testable import App

@MainActor final class LiveWalletControllerTests: XCTestCase {
  private func waitFor(_ predicate: () -> Bool) async throws {
    for _ in 0..<100 {
      if predicate() { return }
      try await Task.sleep(for: .milliseconds(50))
    }
    XCTFail("Wallet controller did not reach the expected state")
  }

  func testHTTPFailureCannotAuthorizeAndRecoveryUsesAFreshDocument() async throws {
    let store = TestAuthStore()
    let native = try fixtureSession(key: .init(), expiry: .now.addingTimeInterval(600))
    try store.save(native)
    let shell = ShellViewController(auth: AuthModel(store: store))
    shell.loadViewIfNeeded()
    defer {
      shell.auth.signOut()
      shell.resume()
    }
    let wallet = try XCTUnwrap(shell.wallet)
    let web = try XCTUnwrap(wallet.webView)
    web.stopLoading()
    let url = try XCTUnwrap(URL(string: "https://audit.oisy.com/"))
    let html = "<script>window.__oisyHost.request('ready', {version:2});</script>"
    web.loadSimulatedRequest(URLRequest(url: url), responseHTML: html)
    try await waitFor { wallet.isReady }
    let before = wallet.session.documentID
    let response = try XCTUnwrap(
      HTTPURLResponse(
        url: url, statusCode: 503,
        httpVersion: "HTTP/1.1", headerFields: ["Content-Type": "text/html"]))
    // loadSimulatedRequest bypasses WebKit's response-policy callback. Exercise
    // that callback explicitly, then verify teardown/recovery in the real view.
    var policy: WKNavigationResponsePolicy?
    wallet.decideResponse(response, mainFrame: true) { policy = $0 }
    XCTAssertEqual(policy, .cancel)
    try await waitFor {
      wallet.session.documentID != before && web.url?.absoluteString == "about:blank"
    }
    XCTAssertFalse(wallet.isReady)
    XCTAssertFalse(wallet.hostPlugin.isAvailable)
    XCTAssertNil(wallet.session.grant)
    XCTAssertEqual(store.signOutCalls, 0)
    let failedDocument = wallet.session.documentID
    web.loadSimulatedRequest(URLRequest(url: url), responseHTML: html)
    try await waitFor { wallet.isReady && wallet.session.documentID != failedDocument }
    XCTAssertNotEqual(wallet.session.documentID, failedDocument)
    XCTAssertEqual(shell.auth.session?.expiresAt, native.expiresAt)
  }

  func testHTTPSDocumentReloadAndProcessFailureKeepTheOriginalSessionDeadline() async throws {
    let store = TestAuthStore()
    let native = try fixtureSession(key: .init(), expiry: .now.addingTimeInterval(600))
    try store.save(native)
    let shell = ShellViewController(auth: AuthModel(store: store))
    shell.loadViewIfNeeded()
    defer {
      shell.auth.signOut()
      shell.resume()
    }
    let wallet = try XCTUnwrap(shell.wallet)
    let web = try XCTUnwrap(wallet.webView)
    web.stopLoading()
    let url = try XCTUnwrap(URL(string: "https://audit.oisy.com/"))
    let html = """
      <html><body>HTTPS fixture<script>
      window.__oisyHost.request('ready', {version:2});
      </script></body></html>
      """
    web.loadSimulatedRequest(URLRequest(url: url), responseHTML: html)
    try await waitFor { wallet.isReady }
    let firstDocument = wallet.session.documentID
    XCTAssertEqual(web.url, url)
    XCTAssertFalse(web.configuration.websiteDataStore.isPersistent)
    XCTAssertEqual(shell.auth.session?.expiresAt, native.expiresAt)

    web.loadSimulatedRequest(URLRequest(url: url), responseHTML: html)
    try await waitFor { wallet.isReady && wallet.session.documentID != firstDocument }
    XCTAssertEqual(shell.auth.session, native)
    XCTAssertEqual(shell.auth.session?.expiresAt, native.expiresAt)

    wallet.webViewWebContentProcessDidTerminate(web)
    XCTAssertFalse(wallet.isReady)
    XCTAssertFalse(wallet.hostPlugin.isAvailable)
    XCTAssertNil(wallet.session.grant)
    XCTAssertEqual(shell.auth.session, native, "WebKit failure must not sign the user out")
    XCTAssertEqual(store.signOutCalls, 0)
    let buttons = wallet.view.subviews.flatMap { $0.subviews }.flatMap { $0.subviews }
    let retry = try XCTUnwrap(buttons.compactMap { $0 as? UIButton }.first)
    XCTAssertEqual(retry.accessibilityIdentifier, "wallet.retry")
    XCTAssertFalse(retry.isHidden)
    XCTAssertTrue(wallet.session.checkExpiration(now: native.expiresAt))
    shell.resume()
    XCTAssertNil(shell.auth.session)
    XCTAssertNil(shell.wallet)
  }
}
