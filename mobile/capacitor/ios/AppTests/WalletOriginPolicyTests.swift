import CryptoKit
import UIKit
import XCTest

@testable import App

final class WalletOriginPolicyTests: XCTestCase {
  func testOnlyBundledTopFrameCanCallTheHost() {
    XCTAssertTrue(
      WalletOriginPolicy.accepts(URL(string: "capacitor://localhost/"), mainFrame: true))
    for path in [
      "/activity/", "/transactions/?network=InternetComputer&token=ICP", "/?search=true",
      "/settings/", "/notes/", "/earn/", "/borrow/",
    ] {
      XCTAssertTrue(
        WalletOriginPolicy.accepts(URL(string: "capacitor://localhost" + path), mainFrame: true))
    }
    for value in [
      "capacitor://localhost/mobile/", "capacitor://localhost/?redirect=https://evil.test",
      "https://localhost", "capacitor://localhost.evil/", "capacitor://localhost:443/",
      "capacitor://user@localhost/", "capacitor://localhost/other",
      "capacitor://localhost/?native=1", "https://app.uniswap.org", "file:///index.html",
    ] {
      XCTAssertFalse(WalletOriginPolicy.accepts(URL(string: value), mainFrame: true), value)
    }
    XCTAssertFalse(
      WalletOriginPolicy.accepts(URL(string: "capacitor://localhost"), mainFrame: false))
    XCTAssertFalse(WalletOriginPolicy.accepts(nil, mainFrame: true))
  }
  func testRootsAreAnAllowlist() {
    XCTAssertNil(WalletRoot(rawValue: "https://example.com"))
    XCTAssertNil(WalletRoot(rawValue: "authorize"))
    XCTAssertEqual(WalletRoot.allCases.count, 6)
  }
  @MainActor func testRootChangesKeepOneWalletAndLogoutRemovesIt() async throws {
    let store = KeychainStore(service: "oisy.capacitor.test.\(UUID())")
    defer { try? store.clear() }
    let native = try fixtureSession(
      key: Curve25519.Signing.PrivateKey(), expiry: .now.addingTimeInterval(600))
    try store.save(native)
    let auth = AuthModel(store: store)
    let shell = ShellViewController(auth: auth)
    shell.walletBootstrapScript =
      "window.fetch = () => Promise.reject(new Error('Offline fixture'));"
    shell.loadViewIfNeeded()
    let wallet = try XCTUnwrap(shell.wallet)
    let initial = try XCTUnwrap(wallet.webView)
    for root in WalletRoot.allCases {
      shell.select(root)
      XCTAssertTrue(initial === shell.wallet?.webView)
    }
    let tabs = try XCTUnwrap(shell.view.subviews.compactMap { $0 as? UITabBar }.first)
    let explore = try XCTUnwrap(tabs.items?.first { $0.tag == 2 })
    tabs.selectedItem = explore
    shell.tabBar(tabs, didSelect: explore)
    shell.select(.activity, notifyWeb: false)
    XCTAssertEqual(tabs.selectedItem?.tag, 2)
    XCTAssertTrue(wallet.view.isHidden, "A late web response must not leave Explore")
    shell.select(.wallet)
    shell.setBlockingPresentation(true)
    XCTAssertTrue(tabs.isHidden)
    shell.setBlockingPresentation(false)
    XCTAssertFalse(tabs.isHidden)
    shell.setBlockingPresentation(true)
    auth.signOut()
    shell.resume()
    XCTAssertNil(shell.wallet)
    XCTAssertTrue(tabs.isHidden, "Signing out returns to the full-screen welcome")
    shell.showExplore()
    XCTAssertFalse(tabs.isHidden, "Signing out must reset blocking presentation state")
    shell.select(.wallet)
    XCTAssertEqual(shell.walletRoot, .wallet)
    XCTAssertNil(try store.load())
  }

  func testNavigationStateRejectsMalformedAndUnboundedMetadata() {
    let valid: [AnyHashable: Any] = [
      "version": 2, "root": "wallet", "requestId": 0, "revision": 0,
    ]
    XCTAssertNotNil(WalletNavigationState(options: valid))
    for (key, values) in [
      ("requestId", [-1, 0.5, true, "1", NSNull(), 9_007_199_254_740_992] as [Any]),
      ("revision", [-1, 0.5, true, "1", NSNull(), 9_007_199_254_740_992] as [Any]),
      ("version", [3, true, "2"] as [Any]),
      ("root", ["https://example.com", "contacts", true] as [Any]),
    ] {
      for value in values {
        var options = valid
        options[key] = value
        XCTAssertNil(WalletNavigationState(options: options), "Invalid " + key)
      }
    }
    var extra = valid
    extra["url"] = "https://example.com"
    XCTAssertNil(WalletNavigationState(options: extra))
    var missing = valid
    missing.removeValue(forKey: "revision")
    XCTAssertNil(WalletNavigationState(options: missing))
  }

  func testGestureParentIsOnlyAnApprovedWalletOrSearchRoot() {
    for (root, path) in [
      (WalletRoot.wallet, "/"), (.wallet, "/?network=InternetComputer"),
      (.search, "/?search=true"), (.search, "/?network=Ethereum&search=true"),
    ] {
      XCTAssertNotNil(WalletBackNavigationPolicy.parentURL(path: path, root: root))
    }
    for path in [
      "https://example.com/", "capacitor://localhost/", "//localhost/", "/transactions/",
      "/?token=ICP", "/?redirect=https://example.com", "/#fragment", "/?network=",
      "/?network=one&network=two", "/?search=false", "/?search=true",
      "/?network=" + String(repeating: "x", count: 257),
    ] {
      XCTAssertNil(WalletBackNavigationPolicy.parentURL(path: path, root: .wallet), path)
    }
    XCTAssertNil(WalletBackNavigationPolicy.parentURL(path: "/", root: .search))
    XCTAssertNil(WalletBackNavigationPolicy.parentURL(path: "/", root: .activity))
    XCTAssertTrue(
      WalletBackNavigationPolicy.isToken(
        URL(string: "capacitor://localhost/transactions/?network=InternetComputer&token=ICP")))
    for path in ["/", "/transactions/", "/transactions/?network=Ethereum&token="] {
      XCTAssertFalse(
        WalletBackNavigationPolicy.isToken(URL(string: "capacitor://localhost" + path)))
    }
  }

  @MainActor func testOnlyLatestRequestAndNewRevisionCommitRootSelection() throws {
    let store = KeychainStore(service: "oisy.capacitor.navigation.\(UUID())")
    defer { try? store.clear() }
    try store.save(
      fixtureSession(key: Curve25519.Signing.PrivateKey(), expiry: .now.addingTimeInterval(600)))
    let shell = ShellViewController(auth: AuthModel(store: store))
    shell.walletBootstrapScript =
      "window.fetch = () => Promise.reject(new Error('Offline fixture'));"
    shell.loadViewIfNeeded()
    defer {
      shell.auth.signOut()
      shell.resume()
    }
    let wallet = try XCTUnwrap(shell.wallet)
    let web = try XCTUnwrap(wallet.webView)
    let tabs = try XCTUnwrap(shell.view.subviews.compactMap { $0 as? UITabBar }.first)
    func report(_ root: WalletRoot, requestID: Int, revision: Int, backPath: String? = nil) throws
      -> WalletNavigationState
    {
      var options: [AnyHashable: Any] = [
        "version": 2, "root": root.rawValue, "requestId": requestID, "revision": revision,
      ]
      if let backPath { options["backPath"] = backPath }
      return try XCTUnwrap(WalletNavigationState(options: options))
    }
    XCTAssertEqual(shell.navigationRequestID, 0)
    shell.select(.activity)
    XCTAssertEqual(shell.navigationRequestID, 1)
    XCTAssertEqual(
      shell.navigationRoot, .activity, "Handshake must deliver the pending destination")
    XCTAssertEqual(shell.walletRoot, .wallet)
    XCTAssertEqual(tabs.selectedItem?.tag, 0)
    XCTAssertFalse(web.allowsBackForwardNavigationGestures)
    shell.select(.search)
    XCTAssertEqual(shell.navigationRequestID, 2)
    XCTAssertFalse(shell.commitNavigation(try report(.activity, requestID: 1, revision: 1)))
    XCTAssertEqual(shell.walletRoot, .wallet)
    XCTAssertTrue(shell.commitNavigation(try report(.search, requestID: 2, revision: 2)))
    XCTAssertEqual(shell.walletRoot, .search)
    XCTAssertFalse(shell.acceptsLegacyNavigation)
    XCTAssertFalse(shell.commitNavigation(try report(.wallet, requestID: 2, revision: 1)))
    XCTAssertFalse(shell.commitNavigation(try report(.wallet, requestID: 2, revision: 2)))
    XCTAssertFalse(shell.commitNavigation(try report(.wallet, requestID: 3, revision: 3)))
    // A safe-looking parent does not enable gestures unless the real document is a token page.
    XCTAssertFalse(
      shell.commitNavigation(
        try report(.search, requestID: 2, revision: 3, backPath: "/?search=true")))
    shell.select(.activity)
    shell.showExplore()
    XCTAssertTrue(shell.commitNavigation(try report(.activity, requestID: 3, revision: 3)))
    XCTAssertEqual(tabs.selectedItem?.tag, 2)
    XCTAssertTrue(wallet.view.isHidden)
    XCTAssertFalse(web.allowsBackForwardNavigationGestures)
    shell.select(.wallet)
    XCTAssertEqual(shell.walletRoot, .activity)
    XCTAssertEqual(tabs.selectedItem?.tag, 1)
    XCTAssertTrue(shell.commitNavigation(try report(.wallet, requestID: 4, revision: 4)))
    XCTAssertEqual(tabs.selectedItem?.tag, 0)
    XCTAssertTrue(web === shell.wallet?.webView)
    shell.resetNavigationForDocument()
    XCTAssertEqual(shell.navigationRequestID, 4, "Reload must keep native request sequencing")
    XCTAssertTrue(shell.acceptsLegacyNavigation)
    XCTAssertTrue(shell.commitNavigation(try report(.wallet, requestID: 4, revision: 0)))
    // Compatibility reports may select a root, but never retain gesture permission.
    web.allowsBackForwardNavigationGestures = true
    shell.select(.activity, notifyWeb: false)
    XCTAssertFalse(web.allowsBackForwardNavigationGestures)
  }

}
