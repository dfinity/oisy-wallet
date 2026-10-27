import UIKit
import XCTest

@testable import App

@MainActor final class ShellLayoutTests: XCTestCase {
  func testExternalKeyboardDoesNotHideRootNavigationAfterSignInReturn() throws {
    let store = KeychainStore(service: "oisy.capacitor.shell-layout.\(UUID())")
    defer { try? store.clear() }
    let shell = ShellViewController(auth: AuthModel(store: store))
    let scene = try XCTUnwrap(UIApplication.shared.connectedScenes.first as? UIWindowScene)
    let previous = scene.keyWindow
    let window = UIWindow(windowScene: scene)
    window.rootViewController = shell
    window.makeKeyAndVisible()
    window.layoutIfNeeded()
    defer {
      window.isHidden = true
      window.rootViewController = nil
      previous?.makeKey()
    }
    let tabs = try XCTUnwrap(shell.view.subviews.compactMap { $0 as? UITabBar }.first)
    XCTAssertTrue(tabs.isHidden, "Welcome is a full-screen introduction")
    shell.showExplore()
    XCTAssertFalse(tabs.isHidden)

    // System authentication can send keyboard notifications belonging to another view.
    NotificationCenter.default.post(
      name: UIResponder.keyboardWillChangeFrameNotification, object: nil,
      userInfo: [
        UIResponder.keyboardFrameEndUserInfoKey: CGRect(
          x: 0, y: window.bounds.height - 300, width: window.bounds.width, height: 300)
      ])
    shell.resume()
    window.layoutIfNeeded()

    XCTAssertFalse(tabs.isHidden, "Returning from system sign-in must retain root navigation")
    XCTAssertEqual(tabs.items?.count, 3)
    XCTAssertGreaterThan(tabs.bounds.height, 44)
    let content = try XCTUnwrap(shell.children.first?.view)
    let contentFrame = content.convert(content.bounds, to: shell.view)
    XCTAssertEqual(contentFrame.maxY, shell.view.bounds.maxY, accuracy: 1)
    XCTAssertGreaterThan(contentFrame.maxY, tabs.frame.minY, "Content must extend behind the tabs")
    let more = try XCTUnwrap(shell.view.subviews.compactMap { $0 as? UIButton }.first)
    XCTAssertEqual(more.accessibilityIdentifier, "navigation.more")
    XCTAssertGreaterThanOrEqual(more.bounds.width, 44)
    XCTAssertGreaterThanOrEqual(more.bounds.height, 44)
    XCTAssertGreaterThan(more.frame.minX, tabs.frame.maxX)
    XCTAssertNotNil(more.configuration?.image)
    let actions = more.menu?.children.compactMap { $0 as? UIMenu }
      .flatMap { $0.children.compactMap { $0 as? UIAction } }
    XCTAssertEqual(actions?.map(\.title), ["Notes", "Earn", "Borrow", "Search"])
    XCTAssertTrue(actions?.allSatisfy { $0.attributes.contains(.disabled) } == true)
    shell.select(.wallet)
    XCTAssertTrue(tabs.isHidden)
    XCTAssertTrue(more.isHidden)
    XCTAssertTrue(tabs.accessibilityElementsHidden)
  }
}
