import CryptoKit
import WebKit
import XCTest

@testable import App

@MainActor final class LiveWalletBridgeTests: XCTestCase {
  func testOnlyExactHTTPSWalletRoutesAreTrusted() {
    for path in ["/", "/activity/", "/transactions/?token=ICP&network=InternetComputer", "/notes/"]
    {
      XCTAssertTrue(
        LiveWalletOriginPolicy.accepts(
          URL(string: "https://audit.oisy.com" + path), mainFrame: true))
    }
    for url in [
      "http://audit.oisy.com/", "https://oisy.com/", "https://audit.oisy.com.evil.test/",
      "https://evil.test/?origin=https://audit.oisy.com", "https://audit.oisy.com:443/",
      "https://user@audit.oisy.com/", "https://audit.oisy.com/signer-callback",
      "https://audit.oisy.com/?redirect=https://evil.test", "capacitor://localhost/",
      "file:///index.html",
    ] {
      XCTAssertFalse(LiveWalletOriginPolicy.accepts(URL(string: url), mainFrame: true), url)
    }
    XCTAssertFalse(
      LiveWalletOriginPolicy.accepts(URL(string: "https://audit.oisy.com/"), mainFrame: false))
  }

  func testRealWebKitBridgeRejectsSubframesStaleDocumentsAndUnexpectedOrigins() async throws {
    let store = TestAuthStore()
    try store.save(fixtureSession(key: .init(), expiry: .now.addingTimeInterval(600)))
    let shell = ShellViewController(auth: AuthModel(store: store))
    shell.walletBootstrapScript = "window.fetch = () => new Promise(() => {});"
    shell.loadViewIfNeeded()
    defer {
      shell.auth.signOut()
      shell.resume()
    }
    shell.wallet?.webView?.stopLoading()
    shell.wallet?.webView?.navigationDelegate = nil
    let session = try XCTUnwrap(shell.wallet?.session)
    let bridge = LiveWalletBridge(session: session)
    bridge.host = shell
    bridge.isAvailable = true
    let configuration = WKWebViewConfiguration()
    configuration.websiteDataStore = .nonPersistent()
    configuration.userContentController.addScriptMessageHandler(
      bridge, contentWorld: .page, name: "oisyHost")
    configuration.userContentController.addUserScript(try bridge.bootstrap())
    let web = WKWebView(
      frame: CGRect(x: 0, y: 0, width: 400, height: 800), configuration: configuration)
    bridge.webView = web
    defer { configuration.userContentController.removeAllScriptMessageHandlers() }
    let url = try XCTUnwrap(URL(string: "https://audit.oisy.com/"))
    web.loadSimulatedRequest(
      URLRequest(url: url), responseHTML: "<html><body>Wallet fixture</body></html>")
    for _ in 0..<100 {
      if (try? await web.evaluateJavaScript("!!window.__oisyHost")) as? Bool == true { break }
      try await Task.sleep(for: .milliseconds(50))
    }
    let ready = try await web.callAsyncJavaScript(
      "return (await window.__oisyHost.request('ready', {version:2})).ok", arguments: [:], in: nil,
      contentWorld: .page)
    XCTAssertEqual(ready as? Bool, true)
    let frameRejected = try await web.callAsyncJavaScript(
      """
      const frame = document.createElement('iframe');
      frame.srcdoc = `<script>
        window.webkit.messageHandlers.oisyHost.postMessage({documentId:'\(session.documentID.uuidString)',method:'ready',options:{version:2}})
          .then(() => parent.postMessage('accepted', '*'), () => parent.postMessage('rejected', '*'));
        </script>`;
      const result = new Promise(resolve => addEventListener('message', event => {
        if (event.source === frame.contentWindow) resolve(event.data);
      }, {once:true}));
      document.body.append(frame);
      return await result;
      """, arguments: [:], in: nil, contentWorld: .page)
    XCTAssertEqual(frameRejected as? String, "rejected")
    session.resetDocument()
    let staleRejected = try await web.callAsyncJavaScript(
      """
      try { await window.__oisyHost.request('ready', {version:2}); return false; }
      catch { return true; }
      """, arguments: [:], in: nil, contentWorld: .page)
    XCTAssertEqual(staleRejected as? Bool, true)
    XCTAssertNil(session.grant)
    let untrustedURL = try XCTUnwrap(URL(string: "https://app.uniswap.org/"))
    web.loadSimulatedRequest(
      URLRequest(url: untrustedURL), responseHTML: "<html><body>Explore fixture</body></html>")
    for _ in 0..<100 {
      if (try? await web.evaluateJavaScript("location.origin")) as? String
        == "https://app.uniswap.org"
      {
        break
      }
      try await Task.sleep(for: .milliseconds(50))
    }
    let originRejected = try await web.callAsyncJavaScript(
      """
      if (window.__oisyHost !== undefined) return false;
      try {
        await window.webkit.messageHandlers.oisyHost.postMessage({
          documentId: documentId, method:'ready', options:{version:2}
        });
        return false;
      } catch { return true; }
      """, arguments: ["documentId": session.documentID.uuidString], in: nil, contentWorld: .page)
    XCTAssertEqual(originRejected as? Bool, true)
  }
}
