import UIKit
import WebKit
import XCTest

@testable import App

@MainActor
final class WalletInteractionsTests: XCTestCase {
  private let parent = URL(string: "https://audit.oisy.com/")!
  private let token = URL(string: "https://audit.oisy.com/transactions/?network=ICP&token=ICP")!

  private func image() -> UIImage {
    UIGraphicsImageRenderer(size: CGSize(width: 10, height: 10)).image { context in
      UIColor.blue.setFill()
      context.fill(CGRect(x: 0, y: 0, width: 10, height: 10))
    }
  }
  func testCancellationKeepsRouteAndCompletionWaitsForPaintedParent() {
    let container = UIView(frame: CGRect(x: 0, y: 0, width: 390, height: 844))
    let web = WKWebView(frame: container.bounds)
    container.addSubview(web)
    var returns = 0
    let interactions = WalletInteractions(
      webView: web, onBack: { returns += 1 }, onRefresh: { _ in },
      snapshot: { $0(self.image()) })
    defer { interactions.close() }
    interactions.capture(parent: parent) { XCTAssertTrue($0) }
    interactions.update(backAllowed: true, refreshAllowed: false)
    XCTAssertFalse(web.allowsBackForwardNavigationGestures)
    XCTAssertTrue(interactions.beginBack())
    interactions.updateBack(progress: 0.25)
    XCTAssertEqual(web.transform.tx, 97.5)
    XCTAssertEqual(container.subviews.count, 2)
    interactions.endBack(commit: false, animated: false)
    XCTAssertEqual(returns, 0)
    XCTAssertEqual(web.transform, .identity)
    XCTAssertEqual(container.subviews.count, 1)
    XCTAssertEqual(interactions.parentURL, parent)
    XCTAssertTrue(interactions.beginBack())
    interactions.updateBack(progress: 0.8)
    interactions.endBack(commit: true, animated: false)
    XCTAssertEqual(returns, 1)
    XCTAssertTrue(interactions.awaitingBack)
    XCTAssertEqual(web.transform.tx, 390)
    interactions.navigationCommitted(url: token)
    XCTAssertTrue(
      interactions.awaitingBack, "An unrelated acknowledgement must not expose the token")
    interactions.navigationCommitted(url: parent)
    XCTAssertFalse(interactions.awaitingBack)
    XCTAssertEqual(web.transform, .identity)
    XCTAssertNil(interactions.parentURL)
    XCTAssertEqual(container.subviews.count, 1)
  }
  func testMissingReturnAcknowledgementRestoresTheLiveWallet() async throws {
    let container = UIView(frame: CGRect(x: 0, y: 0, width: 390, height: 844))
    let web = WKWebView(frame: container.bounds)
    container.addSubview(web)
    let interactions = WalletInteractions(
      webView: web, onBack: {}, onRefresh: { _ in }, snapshot: { $0(self.image()) })
    defer { interactions.close() }
    interactions.capture(parent: parent) { XCTAssertTrue($0) }
    interactions.update(backAllowed: true, refreshAllowed: false)
    XCTAssertTrue(interactions.beginBack())
    interactions.endBack(commit: true, animated: false)
    XCTAssertTrue(interactions.awaitingBack)
    try await Task.sleep(for: .milliseconds(2100))
    XCTAssertFalse(interactions.awaitingBack)
    XCTAssertEqual(web.transform, .identity)
    XCTAssertEqual(container.subviews.count, 1)
    XCTAssertNil(interactions.parentURL)
  }
  func testCaptureTimeoutAndLifecycleDiscardLateImages() async throws {
    let web = WKWebView(frame: CGRect(x: 0, y: 0, width: 390, height: 844))
    var completeSnapshot: (@MainActor (UIImage?) -> Void)?
    let interactions = WalletInteractions(
      webView: web, onBack: {}, onRefresh: { _ in },
      snapshot: { completeSnapshot = $0 })
    defer { interactions.close() }
    var captureResults: [Bool] = []
    interactions.capture(parent: parent) { captureResults.append($0) }
    try await Task.sleep(for: .milliseconds(550))
    XCTAssertEqual(captureResults, [false])
    completeSnapshot?(image())
    XCTAssertNil(interactions.parentURL)
    interactions.capture(parent: parent) { captureResults.append($0) }
    interactions.invalidate()
    completeSnapshot?(image())
    XCTAssertEqual(captureResults, [false, false])
    XCTAssertNil(interactions.parentURL)
  }
  func testPrivacyAndGeometryInvalidationRemoveCapturedContent() {
    let container = UIView(frame: CGRect(x: 0, y: 0, width: 390, height: 844))
    let web = WKWebView(frame: container.bounds)
    container.addSubview(web)
    var returns = 0
    let interactions = WalletInteractions(
      webView: web, onBack: { returns += 1 }, onRefresh: { _ in },
      snapshot: { $0(self.image()) })
    defer { interactions.close() }
    interactions.capture(parent: parent) { XCTAssertTrue($0) }
    interactions.update(backAllowed: true, refreshAllowed: false)
    XCTAssertTrue(interactions.beginBack())
    interactions.clearBack()
    interactions.endBack(commit: true, animated: false)
    XCTAssertEqual(returns, 0)
    XCTAssertNil(interactions.parentURL)
    XCTAssertEqual(web.transform, .identity)
    interactions.capture(parent: parent) { XCTAssertTrue($0) }
    web.bounds.size.width = 300
    interactions.update(backAllowed: true, refreshAllowed: false)
    XCTAssertNil(interactions.parentURL)
    XCTAssertFalse(interactions.canBeginBack)
  }
  func testRefreshHapticOnceExactCompletionAndCancellation() throws {
    let web = WKWebView(frame: CGRect(x: 0, y: 0, width: 390, height: 844))
    let scene = try XCTUnwrap(UIApplication.shared.connectedScenes.first as? UIWindowScene)
    let previous = scene.keyWindow
    let window = UIWindow(windowScene: scene)
    let controller = UIViewController()
    window.rootViewController = controller
    controller.view.addSubview(web)
    window.makeKeyAndVisible()
    window.layoutIfNeeded()
    defer {
      window.isHidden = true
      window.rootViewController = nil
      previous?.makeKey()
    }
    var requests: [Int] = []
    var haptics = 0
    let interactions = WalletInteractions(
      webView: web, onBack: {}, onRefresh: { requests.append($0) },
      haptic: { haptics += 1 })
    defer { interactions.close() }
    interactions.requestRefresh()
    XCTAssertEqual(requests, [])
    interactions.update(backAllowed: false, refreshAllowed: true)
    XCTAssertTrue(web.scrollView.bouncesVertically)
    XCTAssertFalse(web.scrollView.bouncesHorizontally)
    XCTAssertTrue(web.scrollView.refreshControl === interactions.refreshControl)
    interactions.refreshControl.beginRefreshing()
    interactions.refreshControl.sendActions(for: .valueChanged)
    interactions.refreshControl.sendActions(for: .valueChanged)
    XCTAssertEqual(requests, [1])
    XCTAssertEqual(haptics, 1)
    XCTAssertFalse(interactions.finishRefresh(requestID: 0))
    XCTAssertTrue(interactions.refreshControl.isRefreshing)
    XCTAssertFalse(interactions.refreshFeedback.isHidden)
    XCTAssertTrue(interactions.refreshIndicator.isAnimating)
    XCTAssertTrue(interactions.finishRefresh(requestID: 1))
    XCTAssertFalse(interactions.refreshControl.isRefreshing)
    XCTAssertTrue(interactions.refreshFeedback.isHidden)
    XCTAssertFalse(interactions.refreshIndicator.isAnimating)
    XCTAssertFalse(interactions.finishRefresh(requestID: 1))
    interactions.requestRefresh()
    XCTAssertEqual(requests, [1, 2])
    interactions.update(backAllowed: false, refreshAllowed: false)
    XCTAssertNil(interactions.refreshRequestID)
    XCTAssertFalse(web.scrollView.bouncesVertically)
    XCTAssertTrue(interactions.refreshFeedback.isHidden)
    XCTAssertFalse(interactions.finishRefresh(requestID: 2))
    interactions.update(backAllowed: false, refreshAllowed: true)
    interactions.requestRefresh()
    interactions.invalidate()
    XCTAssertEqual(requests, [1, 2, 3])
    XCTAssertEqual(haptics, 3)
    XCTAssertNil(interactions.refreshRequestID)
    XCTAssertTrue(interactions.refreshFeedback.isHidden)
    XCTAssertFalse(interactions.refreshIndicator.isAnimating)
  }
  func testRefreshFeedbackRemainsBelowSafeAreaAfterPullSettles() async throws {
    let scene = try XCTUnwrap(UIApplication.shared.connectedScenes.first as? UIWindowScene)
    let previous = scene.keyWindow
    let window = UIWindow(windowScene: scene)
    let controller = UIViewController()
    window.rootViewController = controller
    let web = WKWebView(frame: window.bounds)
    web.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    web.scrollView.contentInsetAdjustmentBehavior = .never
    web.isOpaque = false
    web.backgroundColor = .systemBackground
    controller.view.backgroundColor = .systemBackground
    controller.view.addSubview(web)
    window.makeKeyAndVisible()
    defer {
      window.isHidden = true
      window.rootViewController = nil
      previous?.makeKey()
    }
    var requests: [Int] = []
    let interactions = WalletInteractions(
      webView: web, onBack: {}, onRefresh: { requests.append($0) }, haptic: {})
    defer { interactions.close() }
    interactions.update(backAllowed: false, refreshAllowed: true)
    interactions.refreshControl.beginRefreshing()
    interactions.refreshControl.sendActions(for: .valueChanged)
    let request = try XCTUnwrap(requests.first)
    // Releasing the pull must not hide loading while the web readers are pending.
    web.scrollView.setContentOffset(.zero, animated: false)
    try await Task.sleep(for: .milliseconds(250))
    for style in [UIUserInterfaceStyle.light, .dark] {
      window.overrideUserInterfaceStyle = style
      window.layoutIfNeeded()
      try await Task.sleep(for: .milliseconds(100))
      let feedback = interactions.refreshFeedback
      let frame = feedback.convert(feedback.bounds, to: window)
      let safeArea = controller.view.convert(
        controller.view.safeAreaLayoutGuide.layoutFrame, to: window)
      XCTAssertGreaterThan(safeArea.minY, 0, "The fixture must exercise a real status-bar inset")
      XCTAssertGreaterThanOrEqual(frame.minY, safeArea.minY + 8)
      XCTAssertEqual(frame.midX, web.convert(web.bounds, to: window).midX, accuracy: 1)
      XCTAssertTrue(window.bounds.contains(frame))
      XCTAssertFalse(feedback.isHidden)
      XCTAssertEqual(interactions.refreshControl.alpha, 0, "Only one spinner should be drawn")
      XCTAssertEqual(feedback.alpha, 1)
      XCTAssertTrue(interactions.refreshIndicator.isAnimating)
      XCTAssertTrue(feedback.isAccessibilityElement)
      XCTAssertFalse(try XCTUnwrap(feedback.accessibilityLabel).isEmpty)
      XCTAssertFalse(feedback.isUserInteractionEnabled)
      XCTAssertEqual(feedback.traitCollection.userInterfaceStyle, style)
      let attachment = XCTAttachment(
        image: UIGraphicsImageRenderer(bounds: window.bounds).image { _ in
          window.drawHierarchy(in: window.bounds, afterScreenUpdates: true)
        })
      attachment.name = style == .light ? "refresh-safe-area-light" : "refresh-safe-area-dark"
      attachment.lifetime = .keepAlways
      add(attachment)
    }
    // A changed safe area (rotation or an expanded system status area) moves the feedback.
    controller.additionalSafeAreaInsets.top = 24
    window.layoutIfNeeded()
    XCTAssertEqual(
      interactions.refreshFeedback.frame.minY,
      controller.view.safeAreaLayoutGuide.layoutFrame.minY + 8, accuracy: 1)
    XCTAssertEqual(requests, [request], "Relayout must not start another data request")
    XCTAssertTrue(interactions.finishRefresh(requestID: request))
    XCTAssertTrue(interactions.refreshFeedback.isHidden)
    XCTAssertFalse(interactions.refreshIndicator.isAnimating)
    interactions.close()
    XCTAssertNil(interactions.refreshFeedback.superview)
    XCTAssertNil(web.scrollView.refreshControl)
  }
  func testBackPreparationAcceptsOnlyExactVersionedParent() {
    let valid: [AnyHashable: Any] = ["version": 2, "root": "wallet", "backPath": "/"]
    XCTAssertNotNil(WalletBackPreparation(options: valid))
    for (key, value) in [
      ("version", true), ("version", 2.5), ("version", "2"),
      ("root", "activity"), ("backPath", "https://example.com"),
      ("extra", "ignored"),
    ] as [(String, Any)] {
      var options = valid
      options[key] = value
      XCTAssertNil(WalletBackPreparation(options: options))
    }
  }
}
