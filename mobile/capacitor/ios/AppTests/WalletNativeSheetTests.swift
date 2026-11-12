import WebKit
import XCTest

@testable import App

@MainActor final class WalletNativeSheetTests: XCTestCase {
  private func waitFor(_ predicate: () -> Bool) async throws {
    for _ in 0..<100 {
      if predicate() { return }
      try await Task.sleep(for: .milliseconds(50))
    }
    XCTFail("Native sheet did not reach expected state")
  }
  func testSheetKeepsDocumentDraftAndSessionAndRejectsStaleCommands() async throws {
    let store = TestAuthStore()
    let session = try fixtureSession(key: .init(), expiry: .now.addingTimeInterval(600))
    try store.save(session)
    let shell = ShellViewController(auth: AuthModel(store: store))
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
    web.stopLoading()
    let url = try XCTUnwrap(URL(string: "https://audit.oisy.com/"))
    web.loadSimulatedRequest(
      URLRequest(url: url),
      responseHTML: """
        <html><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head>
        <body style="min-height:200vh;padding-top:env(safe-area-inset-top)"><input id="draft" value="keep this draft"><script>
        window.documentNonce = crypto.randomUUID(); window.dismissedSheet = '';
        window.__oisyHost.addListener('dismissSheet', event => window.dismissedSheet = event.id);
        window.__oisyHost.request('ready', {version:2});
        </script></body></html>
        """)
    try await waitFor { wallet.isReady && !web.isLoading && wallet.presentedViewController == nil }
    let document = wallet.session.documentID
    let nonce = try await web.evaluateJavaScript("window.documentNonce") as? String
    let commands = WalletHostCommands()
    commands.host = shell
    let id = UUID()
    let options: [AnyHashable: Any] = [
      "version": 2, "documentId": document.uuidString, "id": id.uuidString,
      "size": "medium",
    ]
    func command(_ phase: String) async throws {
      _ = try await commands.execute(
        method: "sheet", options: options.merging(["phase": phase]) { _, value in value })
    }
    for invalid in [
      options.merging(["phase": "arbitrary"]) { _, value in value },
      options.merging(["phase": "prepare", "size": "arbitrary"]) { _, value in value },
      options.merging(["phase": "prepare", "url": "https://evil.example/"]) { _, value in value },
      options.merging(["phase": "prepare", "id": "not-a-uuid"]) { _, value in value },
    ] {
      do {
        _ = try await commands.execute(method: "sheet", options: invalid)
        XCTFail("Invalid sheet accepted")
      } catch {}
    }
    XCTAssertNil(wallet.nativeSheet?.identifier)
    wallet.view.isHidden = true
    do {
      try await command("prepare")
      XCTFail("A hidden wallet must not present above Explore")
    } catch {}
    wallet.view.isHidden = false
    let account = UIViewController()
    await withCheckedContinuation { continuation in
      shell.present(account, animated: false) { continuation.resume() }
    }
    do {
      try await command("prepare")
      XCTFail("An accessory must not replace another native flow")
    } catch {}
    await withCheckedContinuation { continuation in
      account.dismiss(animated: false) { continuation.resume() }
    }
    XCTAssertNil(wallet.nativeSheet?.identifier)
    web.scrollView.setContentOffset(CGPoint(x: 0, y: 160), animated: false)
    let originalOffset = web.scrollView.contentOffset
    let originalPadding =
      try await web.evaluateJavaScript("getComputedStyle(document.body).paddingTop") as? String
    try await command("prepare")
    try await command("present")
    let coordinator = try XCTUnwrap(wallet.nativeSheet)
    let panel = try XCTUnwrap(coordinator.controller)
    XCTAssertNotNil(panel.presentingViewController)
    XCTAssertTrue(web.superview === panel.view)
    XCTAssertEqual(wallet.session.documentID, document)
    XCTAssertEqual(shell.auth.session?.expiresAt, session.expiresAt)
    let currentNonce = try await web.evaluateJavaScript("window.documentNonce") as? String
    XCTAssertEqual(currentNonce, nonce)
    let draft =
      try await web.evaluateJavaScript("document.querySelector('#draft').value") as? String
    XCTAssertEqual(draft, "keep this draft")
    let presentation = try XCTUnwrap(panel.presentationController)
    XCTAssertFalse(coordinator.presentationControllerShouldDismiss(presentation))
    coordinator.presentationControllerDidAttemptToDismiss(presentation)
    try await Task.sleep(for: .milliseconds(100))
    let dismissed = try await web.evaluateJavaScript("window.dismissedSheet") as? String
    XCTAssertEqual(dismissed, id.uuidString.lowercased())
    XCTAssertNotNil(coordinator.controller, "A gesture cannot close the web flow directly")
    let container = try XCTUnwrap(presentation.containerView)
    let backgroundTap = try XCTUnwrap(
      container.gestureRecognizers?.first {
        $0.name == "wallet.sheetBackgroundTap"
      } as? UITapGestureRecognizer)
    let presentedView = try XCTUnwrap(presentation.presentedView)
    let inside = SheetTouch(view: presentedView, point: CGPoint(x: 40, y: 60))
    let outside = SheetTouch(view: presentedView, point: CGPoint(x: 40, y: -60))
    XCTAssertTrue(backgroundTap.delegate === coordinator)
    let systemTap = UITapGestureRecognizer()
    XCTAssertTrue(
      coordinator.gestureRecognizer(
        backgroundTap, shouldRecognizeSimultaneouslyWith: systemTap))
    XCTAssertFalse(
      coordinator.gestureRecognizer(
        systemTap, shouldRecognizeSimultaneouslyWith: backgroundTap))
    XCTAssertTrue(coordinator.gestureRecognizer(backgroundTap, shouldReceive: outside))
    XCTAssertFalse(coordinator.gestureRecognizer(backgroundTap, shouldReceive: inside))
    XCTAssertFalse(
      coordinator.gestureRecognizer(
        backgroundTap, shouldReceive: SheetTouch(view: presentedView, point: CGPoint(x: 40, y: 2))),
      "Tapping the native grabber must not dismiss the sheet")
    _ = try await web.evaluateJavaScript("window.dismissedSheet = ''")
    XCTAssertTrue(
      UIApplication.shared.sendAction(
        NSSelectorFromString("backgroundTapped:"), to: coordinator, from: backgroundTap, for: nil))
    try await Task.sleep(for: .milliseconds(100))
    let tapped = try await web.evaluateJavaScript("window.dismissedSheet") as? String
    XCTAssertEqual(tapped, id.uuidString.lowercased())
    XCTAssertNotNil(coordinator.controller, "Background taps must wait for the web Close guard")
    var stale = options.merging(["phase": "dismiss"]) { _, value in value }
    stale["documentId"] = UUID().uuidString
    do {
      _ = try await commands.execute(method: "sheet", options: stale)
      XCTFail("Stale document accepted")
    } catch {}
    XCTAssertNotNil(coordinator.controller)
    let tabs = try XCTUnwrap(shell.view.subviews.compactMap { $0 as? UITabBar }.first)
    let more = try XCTUnwrap(
      shell.view.subviews.first { $0.accessibilityIdentifier == "navigation.more" })
    shell.setBlockingPresentation(true)
    XCTAssertTrue(tabs.isHidden)
    try await command("dismiss")
    XCTAssertTrue(tabs.isHidden, "An underlying page must keep navigation hidden")
    shell.setBlockingPresentation(false)
    XCTAssertFalse(tabs.isHidden, "Navigation must reappear before WebView restoration finishes")
    XCTAssertFalse(more.isHidden)
    XCTAssertFalse(tabs.isUserInteractionEnabled)
    XCTAssertFalse(more.isUserInteractionEnabled)
    XCTAssertTrue(tabs.accessibilityElementsHidden)
    XCTAssertFalse(shell.walletInteractionsAllowed)
    XCTAssertFalse(coordinator.gestureRecognizer(backgroundTap, shouldReceive: outside))
    try await command("release")
    XCTAssertNil(backgroundTap.view, "The old presentation must not keep a tap handler")
    XCTAssertTrue(tabs.isUserInteractionEnabled)
    XCTAssertTrue(more.isUserInteractionEnabled)
    XCTAssertFalse(tabs.accessibilityElementsHidden)
    XCTAssertNil(coordinator.controller)
    XCTAssertTrue(web.superview === wallet.view)
    XCTAssertEqual(wallet.session.documentID, document)
    let restoredNonce = try await web.evaluateJavaScript("window.documentNonce") as? String
    XCTAssertEqual(restoredNonce, nonce)
    XCTAssertEqual(store.signOutCalls, 0)
    XCTAssertEqual(web.scrollView.contentOffset.y, originalOffset.y, accuracy: 1)
    let restoredPadding =
      try await web.evaluateJavaScript("getComputedStyle(document.body).paddingTop") as? String
    XCTAssertEqual(restoredPadding, originalPadding)
    XCTAssertFalse(
      wallet.view.subviews.contains { $0.accessibilityIdentifier == "wallet.sheetBackground" })

    // Content detents clamp to available height, resize without reloading, and
    // reject invalid/stale layout messages. Accessibility Escape uses web guards.
    try await command("prepare")
    _ = try await commands.execute(
      method: "sheet",
      options: options.merging([
        "phase": "present", "contentHeight": 280,
      ]) { _, value in value })
    let fitted = try XCTUnwrap(coordinator.controller)
    _ = try await web.evaluateJavaScript("window.dismissedSheet = ''")
    XCTAssertFalse(coordinator.gestureRecognizer(backgroundTap, shouldReceive: outside))
    _ = UIApplication.shared.sendAction(
      NSSelectorFromString("backgroundTapped:"), to: coordinator, from: backgroundTap, for: nil)
    try await Task.sleep(for: .milliseconds(100))
    let staleTap = try await web.evaluateJavaScript("window.dismissedSheet") as? String
    XCTAssertEqual(staleTap, "", "A previous sheet's recognizer must not close a new sheet")
    XCTAssertEqual(
      fitted.sheetPresentationController?.selectedDetentIdentifier,
      WalletSheetCoordinator.contentDetent)
    XCTAssertEqual(coordinator.contentHeight, 280)
    for height in [600, 220, 100_000] {
      _ = try await commands.execute(
        method: "sheet",
        options: options.merging([
          "phase": "resize", "contentHeight": height,
        ]) { _, value in value })
      XCTAssertEqual(coordinator.contentHeight, height)
    }
    for badHeight: Any in [0, -1, 1.5, Double.nan, Double.infinity, 100_001, true, "200"] {
      do {
        _ = try await commands.execute(
          method: "sheet",
          options: options.merging([
            "phase": "resize", "contentHeight": badHeight,
          ]) { _, value in value })
        XCTFail("Invalid content height accepted")
      } catch {}
    }
    for overrides: [AnyHashable: Any] in [
      ["phase": "resize", "contentHeight": 300, "id": UUID().uuidString],
      ["phase": "resize", "contentHeight": 300, "documentId": UUID().uuidString],
      ["phase": "resize"],
      ["phase": "dismiss", "contentHeight": 300],
    ] {
      do {
        _ = try await commands.execute(
          method: "sheet", options: options.merging(overrides) { _, value in value })
        XCTFail("Invalid or stale resize accepted")
      } catch {}
    }
    XCTAssertTrue(fitted.accessibilityPerformEscape())
    XCTAssertNotNil(coordinator.controller, "VoiceOver dismissal must wait for web guards")
    try await command("dismiss")
    do {
      try coordinator.resize(id: id, contentHeight: 300)
      XCTFail("A departing sheet must not resize")
    } catch {}
    try await command("release")
    XCTAssertNil(coordinator.contentHeight)

    // Process loss during an open sheet restores native recovery, not a stale snapshot.
    let secondID = UUID()
    try await coordinator.prepare(id: secondID)
    try await coordinator.present(id: secondID, size: .large)
    wallet.webViewWebContentProcessDidTerminate(web)
    XCTAssertNil(coordinator.controller)
    XCTAssertNil(coordinator.identifier)
    XCTAssertTrue(web.superview === wallet.view)
    XCTAssertFalse(wallet.isReady)
    XCTAssertNotNil(shell.auth.session)

    web.loadSimulatedRequest(
      URLRequest(url: url),
      responseHTML:
        "<html><body style='height:100vh'>Expiry fixture<script>window.__oisyHost.request('ready', {version:2});</script></body></html>"
    )
    try await waitFor { wallet.isReady && !web.isLoading && wallet.presentedViewController == nil }
    try await Task.sleep(for: .milliseconds(200))
    let expiringID = UUID()
    try await coordinator.prepare(id: expiringID)
    try await coordinator.present(id: expiringID, size: .medium)
    XCTAssertTrue(wallet.session.checkExpiration(now: session.expiresAt.addingTimeInterval(1)))
    try await waitFor { shell.wallet == nil }
    XCTAssertNil(coordinator.identifier)
    XCTAssertNil(coordinator.controller)
  }
}

/// Supplies locations to UIKit's gesture delegate without fabricating an event.
@MainActor private final class SheetTouch: UITouch {
  let referenceView: UIView
  let point: CGPoint
  init(view: UIView, point: CGPoint) {
    referenceView = view
    self.point = point
    super.init()
  }
  override func location(in view: UIView?) -> CGPoint {
    referenceView.convert(point, to: view)
  }
}
