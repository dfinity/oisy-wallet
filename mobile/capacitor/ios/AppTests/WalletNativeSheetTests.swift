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
        <html><body><input id="draft" value="keep this draft"><script>
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
    var stale = options.merging(["phase": "dismiss"]) { _, value in value }
    stale["documentId"] = UUID().uuidString
    do {
      _ = try await commands.execute(method: "sheet", options: stale)
      XCTFail("Stale document accepted")
    } catch {}
    XCTAssertNotNil(coordinator.controller)
    try await command("dismiss")
    try await command("release")
    XCTAssertNil(coordinator.controller)
    XCTAssertTrue(web.superview === wallet.view)
    XCTAssertEqual(wallet.session.documentID, document)
    let restoredNonce = try await web.evaluateJavaScript("window.documentNonce") as? String
    XCTAssertEqual(restoredNonce, nonce)
    XCTAssertEqual(store.signOutCalls, 0)

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
