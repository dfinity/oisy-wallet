import CryptoKit
import Network
import SwiftUI
import WebKit
import XCTest

@testable import App

// This test serves an ephemeral loopback fixture. Fixture accounts never enter a public dapp.
@MainActor
final class BrowserWebKitTests: XCTestCase {
  private func evaluate(_ view: WKWebView, _ code: String) async throws -> String {
    let result = try await view.callAsyncJavaScript(
      code, arguments: [:], in: nil, contentWorld: .page)
    return try XCTUnwrap(result as? String)
  }
  private func waitFor(_ condition: () -> Bool) async throws {
    for _ in 0..<500 {
      if condition() { return }
      try await Task.sleep(for: .milliseconds(10))
    }
    XCTFail("WebKit did not reach expected state")
  }
  private func fixture(url: URL) async throws -> BrowserModel {
    let browser = BrowserModel()
    browser.open(url)
    try await waitFor { !browser.isLoading && browser.provider.origin != nil }
    try await Task.sleep(for: .milliseconds(200))
    return browser
  }
  func testLogoutDiscardsExploreBeforeAccountAddressHasLoaded() async throws {
    let server = try BrowserTestServer()
    let url = try await server.start()
    defer { server.listener.cancel() }
    let store = KeychainStore(service: "oisy.explore.logout.\(UUID())")
    defer { try? store.clear() }
    try store.save(
      fixtureSession(
        key: Curve25519.Signing.PrivateKey(), expiry: .now.addingTimeInterval(600)))
    let shell = ShellViewController(auth: AuthModel(store: store))
    shell.walletBootstrapScript = "window.fetch = async () => { throw new Error('Test offline'); };"
    shell.loadViewIfNeeded()
    shell.browser.open(url)
    XCTAssertNotNil(shell.browser.webView)
    XCTAssertNil(shell.browser.provider.account)
    shell.auth.signOut()
    shell.resume()
    XCTAssertNil(shell.wallet)
    XCTAssertNil(shell.browser.webView)
    XCTAssertNil(shell.browser.provider.origin)
  }

  func testPageWorldDiscoveryConsentEventsAndSubframeRejection() async throws {
    try await exerciseBridge(typeSize: .large, captureName: "browser-native-consent")
  }
  func testAccessibleConsentPresentation() async throws {
    try await exerciseBridge(
      typeSize: .accessibility5, captureName: "browser-native-consent-accessibility")
  }
  private func exerciseBridge(typeSize: DynamicTypeSize, captureName: String) async throws {
    let server = try BrowserTestServer()
    let url = try await server.start()
    defer { server.listener.cancel() }
    let browser = try await fixture(url: url)
    defer {
      browser.updateAccount(nil)
      browser.close()
    }
    let view = try XCTUnwrap(browser.webView)
    let scene = try XCTUnwrap(UIApplication.shared.connectedScenes.first as? UIWindowScene)
    let previousWindow = scene.keyWindow
    let window = UIWindow(windowScene: scene)
    window.traitOverrides.preferredContentSizeCategory =
      typeSize == .accessibility5 ? .accessibilityExtraExtraExtraLarge : .large
    window.rootViewController = UIHostingController(
      rootView: NavigationStack { BrowserView(browser: browser, openWallet: {}) }.environment(
        \.dynamicTypeSize, typeSize
      ).tint(Color("OisyBrandPrimary")))
    window.makeKeyAndVisible()
    defer {
      window.isHidden = true
      window.rootViewController = nil
      previousWindow?.makeKey()
    }
    let discovery = try await evaluate(
      view,
      """
      let info;
      window.addEventListener('eip6963:announceProvider', e => info = e.detail.info, {once:true});
      window.dispatchEvent(new Event('eip6963:requestProvider'));
      return JSON.stringify({name:info.name, rdns:info.rdns, same:window.oisy.provider === window.ethereum,
        chain:await ethereum.request({method:'eth_chainId'}), accounts:await ethereum.request({method:'eth_accounts'})});
      """)
    let payload = try JSONDecoder().decode(BrowserJSON.self, from: Data(discovery.utf8))
    XCTAssertEqual(payload.object?["name"], .string("OISY"))
    XCTAssertEqual(payload.object?["rdns"], .string("com.oisy"))
    XCTAssertEqual(payload.object?["same"], .bool(true))
    XCTAssertEqual(payload.object?["chain"], .string("0xaa36a7"))
    XCTAssertEqual(payload.object?["accounts"], .array([]))
    let fixtureAddress = "0x" + String(repeating: "2", count: 40)
    browser.updateAccount(
      .init(
        principal: "webkit-test-\(UUID())", address: fixtureAddress,
        expiresAt: .now.addingTimeInterval(60)))
    let connect = Task {
      try await evaluate(
        view,
        """
        window.accountEvents = [];
        ethereum.on('accountsChanged', a => window.accountEvents.push(a));
        return JSON.stringify(await ethereum.request({method:'eth_requestAccounts'}));
        """)
    }
    try await waitFor { browser.provider.pending != nil }
    XCTAssertEqual(browser.provider.pending?.origin, BrowserOrigin(url: url))
    try await Task.sleep(for: .milliseconds(500))
    let snapshot = UIGraphicsImageRenderer(bounds: window.bounds).image { _ in
      window.drawHierarchy(in: window.bounds, afterScreenUpdates: true)
    }
    let attachment = XCTAttachment(image: snapshot)
    attachment.name = captureName
    attachment.lifetime = .keepAlways
    add(attachment)
    browser.provider.approve()
    let result = try await connect.value
    XCTAssertEqual(result, "[\"\(fixtureAddress)\"]")
    browser.provider.revoke()
    let events = try await evaluate(view, "return JSON.stringify(window.accountEvents);")
    XCTAssertEqual(events, "[[\"\(fixtureAddress)\"],[]]")

    // A same-origin iframe tries the raw handler; main-frame-only injection is not the only guard.
    let subframe = try await evaluate(
      view,
      """
      const frame = document.createElement('iframe');
      document.body.appendChild(frame);
      const child = frame.contentWindow;
      const injected = Boolean(child.ethereum);
      const response = JSON.parse(await child.webkit.messageHandlers.oisy.postMessage(
        JSON.stringify({method:'eth_requestAccounts', origin:'https://browser-test.invalid'})));
      frame.remove();
      return JSON.stringify({injected, code:response.error.code});
      """)
    XCTAssertEqual(
      try JSONDecoder().decode(BrowserJSON.self, from: Data(subframe.utf8)),
      .object(["injected": .bool(false), "code": .number(4100)]))
    XCTAssertNil(browser.provider.pending)
    let signing = try await evaluate(
      view,
      """
      try { await ethereum.request({method:'eth_sendTransaction',params:[{}]}); return 'unexpected'; }
      catch (error) { return String(error.code); }
      """)
    XCTAssertEqual(signing, "4200")
    browser.updateAccount(nil)
  }
}

// Bound to 127.0.0.1 only, with an OS-assigned port. No test server ships in the app.
private final class BrowserTestServer {
  let listener: NWListener
  init() throws {
    let parameters = NWParameters.tcp
    parameters.requiredLocalEndpoint = .hostPort(host: "127.0.0.1", port: .any)
    listener = try NWListener(using: parameters)
    let html = "<html><body><h1>OISY browser test</h1></body></html>"
    let response = Data(
      "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: \(html.utf8.count)\r\nConnection: close\r\n\r\n\(html)"
        .utf8)
    listener.newConnectionHandler = { connection in
      connection.start(queue: .main)
      connection.receive(minimumIncompleteLength: 1, maximumLength: 65536) { _, _, _, _ in
        connection.send(
          content: response, completion: .contentProcessed { _ in connection.cancel() })
      }
    }
  }
  func start() async throws -> URL {
    let listener = listener
    return try await withCheckedThrowingContinuation { continuation in
      listener.stateUpdateHandler = { state in
        switch state {
        case .ready:
          listener.stateUpdateHandler = nil
          guard let port = listener.port, let url = URL(string: "http://127.0.0.1:\(port.rawValue)")
          else {
            continuation.resume(throwing: URLError(.badURL))
            return
          }
          continuation.resume(returning: url)
        case .failed(let error):
          listener.stateUpdateHandler = nil
          continuation.resume(throwing: error)
        default: break
        }
      }
      listener.start(queue: .main)
    }
  }
}
