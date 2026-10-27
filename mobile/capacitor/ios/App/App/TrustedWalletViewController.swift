import Capacitor
import WebKit

/// Local top-level wallet only; the Explore WebView has no Capacitor bridge.
enum WalletOriginPolicy {
  static func accepts(_ url: URL?, mainFrame: Bool) -> Bool {
    guard let url, let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
    else { return false }
    return mainFrame && url.scheme == "capacitor" && url.host == "localhost"
      && url.port == nil && url.user == nil && url.password == nil
      && [
        "", "/", "/index.html", "/activity/", "/transactions/", "/settings/", "/notes/", "/earn/",
        "/borrow/",
      ].contains(
        components.path)
      && (components.queryItems ?? []).allSatisfy {
        ["network", "token", "search"].contains($0.name)
      }
  }
}

@MainActor
final class TrustedWalletViewController: CAPBridgeViewController {
  let hostPlugin = OisyHostPlugin()
  let session: WalletSession
  private var messageGate: WalletMessageGate?
  #if DEBUG
    var bootstrapScript: String?
  #endif

  init(session: WalletSession) {
    self.session = session
    super.init(nibName: nil, bundle: nil)
  }
  required init?(coder: NSCoder) { nil }
  override func webViewConfiguration(for configuration: InstanceConfiguration)
    -> WKWebViewConfiguration
  {
    let result = super.webViewConfiguration(for: configuration)
    result.websiteDataStore = .nonPersistent()
    return result
  }
  override func capacitorDidLoad() {
    guard let webView,
      let forward = webView.navigationDelegate as? WebViewDelegationHandler
    else { return }
    let gate = WalletMessageGate(forward: forward)
    let controller = webView.configuration.userContentController
    #if DEBUG
      if let bootstrapScript {
        controller.addUserScript(
          WKUserScript(
            source: bootstrapScript,
            injectionTime: .atDocumentStart, forMainFrameOnly: true))
      }
    #endif
    controller.removeScriptMessageHandler(forName: "bridge")
    controller.add(gate, name: "bridge")
    messageGate = gate
    bridge?.registerPluginInstance(hostPlugin)
    webView.scrollView.bounces = false
    webView.scrollView.contentInsetAdjustmentBehavior = .never
    webView.allowsBackForwardNavigationGestures = false
    webView.isInspectable = _isDebugAssertConfiguration()
  }
  func close() {
    session.close()
    hostPlugin.host = nil
    webView?.stopLoading()
    webView?.configuration.userContentController.removeScriptMessageHandler(forName: "bridge")
    webView?.configuration.userContentController.removeAllUserScripts()
    webView?.navigationDelegate = nil
    webView?.loadHTMLString("", baseURL: nil)
    messageGate = nil
  }
}

@MainActor
private final class WalletMessageGate: NSObject, WKScriptMessageHandler {
  private weak var forward: WebViewDelegationHandler?
  init(forward: WebViewDelegationHandler) { self.forward = forward }
  func userContentController(
    _ controller: WKUserContentController, didReceive message: WKScriptMessage
  ) {
    guard
      WalletOriginPolicy.accepts(
        message.frameInfo.request.url, mainFrame: message.frameInfo.isMainFrame),
      WalletOriginPolicy.accepts(message.webView?.url, mainFrame: true),
      message.frameInfo.securityOrigin.protocol == "capacitor",
      message.frameInfo.securityOrigin.host == "localhost"
    else { return }
    guard let body = message.body as? [String: Any], body["type"] as? String == "message",
      body["pluginId"] as? String == "OisyHost",
      let method = body["methodName"] as? String,
      [
        "ready", "navigate", "presentation", "openAccount", "wallet", "addListener",
        "removeListener",
      ].contains(
        method)
    else { return }
    forward?.userContentController(controller, didReceive: message)
  }
}
