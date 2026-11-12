import XCTest

@MainActor final class MobileShellTests: XCTestCase {
  func testSignedOutShellHasExploreAndNoNativeWalletMode() {
    let app = XCUIApplication()
    app.launchArguments += ["-com.oisy.native.mvp.audit-session.hasSignedIn", "NO"]
    app.launch()
    let signIn = app.buttons["auth.sign_in"]
    XCTAssertTrue(signIn.waitForExistence(timeout: 10))
    XCTAssertEqual(signIn.label, "Open or create")
    XCTAssertTrue(app.staticTexts["auth.first.title"].exists)
    XCTAssertFalse(app.buttons["preview.explore"].exists)
    XCTAssertFalse(app.tabBars.firstMatch.exists)
    XCTAssertFalse(app.buttons["navigation.more"].exists)
    app.buttons["auth.explore"].tap()
    XCTAssertTrue(app.buttons["browser.uniswap"].waitForExistence(timeout: 5))
    XCTAssertTrue(app.buttons["browser.oneinch"].exists)
    XCTAssertEqual(app.tabBars.buttons.count, 3)
    XCTAssertTrue(app.buttons["navigation.more"].isHittable)
    app.tabBars.buttons["tab.wallet"].tap()
    XCTAssertTrue(signIn.isHittable)
    XCTAssertFalse(app.tabBars.firstMatch.exists)
  }

  func testReturningWelcomeAndAccessibleTextKeepSignInAvailable() {
    let app = XCUIApplication()
    app.launchArguments += [
      "-com.oisy.native.mvp.audit-session.hasSignedIn", "YES",
      "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL",
    ]
    app.launch()
    let signIn = app.buttons["auth.sign_in"]
    XCTAssertTrue(signIn.waitForExistence(timeout: 10))
    XCTAssertEqual(signIn.label, "Open Wallet")
    XCTAssertTrue(app.staticTexts["auth.returning.title"].exists)
    app.swipeUp()
    XCTAssertTrue(signIn.isHittable)
    let capture = XCTAttachment(screenshot: app.screenshot())
    capture.name = "welcome-returning-accessibility"
    capture.lifetime = .keepAlways
    add(capture)
  }
}
