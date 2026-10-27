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
}
