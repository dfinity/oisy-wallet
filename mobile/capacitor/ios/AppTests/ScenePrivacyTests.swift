import UIKit
import XCTest

@testable import App

@MainActor final class ScenePrivacyTests: XCTestCase {
  func testInactiveWindowCoversPresentedSheetsAndRemovesCoverOnReturn() async throws {
    let scene = try XCTUnwrap(UIApplication.shared.connectedScenes.first as? UIWindowScene)
    let previous = scene.keyWindow
    let window = UIWindow(windowScene: scene)
    let root = UIViewController()
    root.view.backgroundColor = .red
    window.rootViewController = root
    window.makeKeyAndVisible()
    defer {
      window.isHidden = true
      window.rootViewController = nil
      previous?.makeKey()
    }
    let sheet = UIViewController()
    sheet.view.backgroundColor = .blue
    sheet.modalPresentationStyle = .pageSheet
    await withCheckedContinuation { continuation in
      root.present(sheet, animated: false) { continuation.resume() }
    }
    let delegate = SceneDelegate()
    delegate.window = window
    delegate.sceneWillResignActive(scene)
    let cover = try XCTUnwrap(window.subviews.last)
    XCTAssertEqual(cover.accessibilityIdentifier, "privacy.cover")
    XCTAssertEqual(cover.frame, window.bounds)
    XCTAssertEqual(cover.backgroundColor, .systemBackground)
    XCTAssertTrue(cover.isOpaque)
    XCTAssertEqual(cover.alpha, 1)
    XCTAssertGreaterThan(cover.layer.zPosition, 0)
    XCTAssertFalse(cover.isHidden)
    XCTAssertTrue(cover.isUserInteractionEnabled)
    XCTAssertTrue(cover.accessibilityElementsHidden)
    XCTAssertNotNil(root.presentedViewController)
    delegate.sceneWillResignActive(scene)
    XCTAssertTrue(window.subviews.last === cover, "Repeated inactivity must reuse the cover")
    delegate.sceneDidBecomeActive(scene)
    XCTAssertNil(cover.superview)
    XCTAssertTrue(root.presentedViewController === sheet)
  }

  func testForegroundExpiresWalletBeforeRemovingPrivacyCover() throws {
    let scene = try XCTUnwrap(UIApplication.shared.connectedScenes.first as? UIWindowScene)
    let previous = scene.keyWindow
    let store = TestAuthStore()
    try store.save(fixtureSession(key: .init(), expiry: .now.addingTimeInterval(0.5)))
    let shell = ShellViewController(auth: AuthModel(store: store))
    shell.walletBootstrapScript =
      "window.fetch = () => Promise.reject(new Error('Offline fixture'));"
    let window = UIWindow(windowScene: scene)
    window.rootViewController = shell
    window.makeKeyAndVisible()
    defer {
      window.isHidden = true
      window.rootViewController = nil
      previous?.makeKey()
    }
    XCTAssertNotNil(shell.wallet)
    let delegate = SceneDelegate()
    delegate.window = window
    delegate.sceneWillResignActive(scene)
    let cover = try XCTUnwrap(window.subviews.last)
    XCTAssertEqual(cover.accessibilityIdentifier, "privacy.cover")
    // Simulate suspension: the ordinary expiry timer cannot run on the main actor.
    Thread.sleep(forTimeInterval: 0.6)
    XCTAssertNotNil(shell.wallet, "The expiry timer must not resolve this test for us")
    XCTAssertTrue(cover.superview === window)
    delegate.sceneDidBecomeActive(scene)
    XCTAssertNil(shell.auth.session)
    XCTAssertNil(shell.wallet, "Expired content must be discarded before the cover is removed")
    XCTAssertNil(cover.superview)
    XCTAssertFalse(shell.walletInteractionsAllowed)
  }
}
