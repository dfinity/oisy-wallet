import WebKit

/// No generic plugin API. WebKit binds each reply to its requesting JS context.
@MainActor
final class LiveWalletBridge: NSObject, WKScriptMessageHandlerWithReply {
  let session: WalletSession
  weak var webView: WKWebView?
  var isAvailable = false
  #if DEBUG
    // XCTest supplies local fixture content; never populated by an app launch or website.
    var testOrigin: URL?
  #endif
  private var origin: URL? {
    #if DEBUG
      if let testOrigin { return testOrigin }
    #endif
    return LiveWalletOriginPolicy.baseURL
  }
  var onReady: (() -> Void)?
  private let commands = WalletHostCommands()
  var host: ShellViewController? {
    get { commands.host }
    set { commands.host = newValue }
  }

  init(session: WalletSession) { self.session = session }

  func userContentController(
    _ controller: WKUserContentController, didReceive message: WKScriptMessage,
    replyHandler: @escaping @MainActor @Sendable (Any?, String?) -> Void
  ) {
    guard isAvailable, host?.wallet?.session === session, message.webView === webView,
      LiveWalletOriginPolicy.accepts(
        message.frameInfo.request.url, mainFrame: message.frameInfo.isMainFrame, origin: origin),
      LiveWalletOriginPolicy.accepts(webView?.url, mainFrame: true, origin: origin),
      message.frameInfo.securityOrigin.protocol == origin?.scheme,
      message.frameInfo.securityOrigin.host == origin?.host,
      [0, 443].contains(message.frameInfo.securityOrigin.port),
      let body = message.body as? [String: Any],
      Set(body.keys) == ["documentId", "method", "options"],
      body["documentId"] as? String == session.documentID.uuidString,
      let method = body["method"] as? String,
      let options = body["options"] as? [String: Any],
      JSONSerialization.isValidJSONObject(body),
      let data = try? JSONSerialization.data(withJSONObject: body), data.count <= 80_000
    else {
      replyHandler(nil, "Unsupported or stale host request")
      return
    }
    let document = session.documentID
    Task { @MainActor [weak self] in
      guard let self else {
        replyHandler(nil, "Wallet unavailable")
        return
      }
      do {
        let result = try await commands.execute(method: method, options: options)
        guard isAvailable, host?.wallet?.session === session,
          document == session.documentID,
          LiveWalletOriginPolicy.accepts(webView?.url, mainFrame: true, origin: origin)
        else { throw WalletHostCommandError.unavailable }
        replyHandler(["ok": true, "value": result.value], nil)
        if method == "ready" { onReady?() }
        result.afterDelivery?()
      } catch OperationJournalError.conflict {
        replyHandler(["ok": false, "code": "OPERATION_JOURNAL_CONFLICT"], nil)
      } catch {
        replyHandler(nil, "Unsupported or stale host request")
      }
    }
  }

  private func event(_ name: String, values: [String: Any] = [:]) {
    guard isAvailable, !session.checkExpiration(),
      LiveWalletOriginPolicy.accepts(webView?.url, mainFrame: true, origin: origin)
    else { return }
    let values = values.merging([
      "version": 2, "documentId": session.documentID.uuidString,
    ]) { _, current in current }
    webView?.callAsyncJavaScript(
      "window.__oisyHost?.receive(name, value)",
      arguments: ["name": name, "value": values], in: nil, in: .page,
      completionHandler: nil)
  }
  func dismissSheet(id: UUID) {
    guard host?.wallet?.nativeSheet?.identifier == id else { return }
    event("dismissSheet", values: ["id": id.uuidString.lowercased()])
  }
  func returnToParent() {
    guard host?.walletInteractionsAllowed == true else { return }
    event("back")
  }
  func refresh(requestID: Int) {
    guard host?.walletInteractionsAllowed == true, host?.walletRoot == .wallet else { return }
    event("refresh", values: ["requestId": requestID])
  }
  func select(_ root: String) { host?.requestWebScreen(root) }
  func select(_ root: String, requestID: Int) {
    event("navigate", values: ["root": root, "requestId": requestID])
  }

  func bootstrap() throws -> WKUserScript {
    guard let origin,
      let url = Bundle.main.url(forResource: "LiveWalletBridge", withExtension: "js")
    else { throw WalletHostCommandError.unavailable }
    let script = try String(contentsOf: url, encoding: .utf8)
    let data = try JSONSerialization.data(withJSONObject: [
      "protocol": origin.scheme.map { $0 + ":" } ?? "", "host": origin.host ?? "",
      "documentId": session.documentID.uuidString,
    ])
    return WKUserScript(
      source: script.replacingOccurrences(
        of: "__OISY_BOOTSTRAP__", with: String(decoding: data, as: UTF8.self)),
      injectionTime: .atDocumentStart, forMainFrameOnly: true)
  }
}
