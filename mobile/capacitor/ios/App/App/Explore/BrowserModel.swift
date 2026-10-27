import Observation
import SwiftUI
import WebKit

@MainActor @Observable
final class BrowserModel: NSObject, WKNavigationDelegate, WKUIDelegate {
  let provider = BrowserProvider()
  private(set) var webView: WKWebView?
  private(set) var url: URL?
  private(set) var isLoading = false
  private(set) var canGoBack = false
  private(set) var canGoForward = false
  var error: String?
  @ObservationIgnored private var observations: [NSKeyValueObservation] = []

  override init() {
    super.init()
    provider.accountsChanged = { [weak self] accounts in
      guard let self, let webView, let url = webView.url,
        BrowserOrigin(url: url) == provider.origin
      else { return }
      webView.callAsyncJavaScript(
        "window.oisy?.emitAccounts(accounts)",
        arguments: ["accounts": accounts], in: nil, in: .page)
    }
  }
  func updateAccount(_ account: BrowserAccount?) {
    if let old = provider.account, old.principal != account?.principal { close() }
    provider.updateAccount(account)
  }
  func open(_ url: URL) {
    guard allowed(url) else { return }
    if webView == nil {
      guard let resource = Bundle.main.url(forResource: "inpage", withExtension: "js"),
        let script = try? String(contentsOf: resource, encoding: .utf8)
      else {
        error = String(localized: "browser.load_failed")
        return
      }
      let configuration = WKWebViewConfiguration()
      configuration.websiteDataStore = .nonPersistent()
      configuration.userContentController.addScriptMessageHandler(
        BrowserBridge(owner: self), contentWorld: .page, name: "oisy")
      configuration.userContentController.addUserScript(
        WKUserScript(
          source: script, injectionTime: .atDocumentStart, forMainFrameOnly: true, in: .page))
      let view = WKWebView(frame: .zero, configuration: configuration)
      view.navigationDelegate = self
      view.uiDelegate = self
      view.allowsBackForwardNavigationGestures = true
      #if DEBUG
        view.isInspectable = true
      #endif
      webView = view
      observations = [
        view.observe(\.url, options: [.new]) { [weak self] view, _ in
          MainActor.assumeIsolated { self?.url = view.url }
        },
        view.observe(\.isLoading, options: [.new]) { [weak self] view, _ in
          MainActor.assumeIsolated { self?.isLoading = view.isLoading }
        },
        view.observe(\.canGoBack, options: [.new]) { [weak self] view, _ in
          MainActor.assumeIsolated { self?.canGoBack = view.canGoBack }
        },
        view.observe(\.canGoForward, options: [.new]) { [weak self] view, _ in
          MainActor.assumeIsolated { self?.canGoForward = view.canGoForward }
        },
      ]
    }
    error = nil
    self.url = url
    webView?.load(URLRequest(url: url))
  }
  func close() {
    provider.navigate(to: nil)
    webView?.stopLoading()
    webView?.configuration.userContentController.removeScriptMessageHandler(
      forName: "oisy", contentWorld: .page)
    webView?.navigationDelegate = nil
    webView?.uiDelegate = nil
    observations.removeAll()
    webView = nil
    url = nil
    isLoading = false
    canGoBack = false
    canGoForward = false
  }
  private func allowed(_ url: URL) -> Bool {
    guard BrowserOrigin(url: url) != nil else {
      error = String(localized: "browser.invalid_url")
      return false
    }
    guard
      !["id.ai", "identity.ic0.app", "identity.internetcomputer.org"].contains(
        url.host()?.lowercased())
    else {
      error = String(localized: "browser.auth_in_wallet")
      return false
    }
    return true
  }
  func webView(
    _ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
    decisionHandler: @escaping @MainActor @Sendable (WKNavigationActionPolicy) -> Void
  ) {
    if action.targetFrame?.isMainFrame == false,
      ["about:blank", "about:srcdoc"].contains(action.request.url?.absoluteString)
    {
      decisionHandler(.allow)
      return
    }
    guard let target = action.request.url, allowed(target) else {
      decisionHandler(.cancel)
      return
    }
    if action.targetFrame?.isMainFrame == true {
      provider.navigate(to: BrowserOrigin(url: target))
    }
    decisionHandler(.allow)
  }
  func webView(_ webView: WKWebView, didCommit navigation: WKNavigation!) {
    if let url = webView.url {
      provider.navigate(to: BrowserOrigin(url: url))
    }
  }
  func webView(
    _ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!,
    withError error: any Error
  ) {
    if (error as NSError).code != NSURLErrorCancelled {
      self.error = String(localized: "browser.load_failed")
    }
  }
  func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: any Error)
  {
    self.webView(webView, didFailProvisionalNavigation: navigation, withError: error)
  }
  func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
    provider.navigate(to: nil)
    error = String(localized: "browser.load_failed")
  }
  func webView(
    _ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
    for action: WKNavigationAction, windowFeatures: WKWindowFeatures
  ) -> WKWebView? {
    if action.targetFrame == nil, let url = action.request.url { open(url) }
    return nil
  }
}

@MainActor
private final class BrowserBridge: NSObject, WKScriptMessageHandlerWithReply {
  weak var owner: BrowserModel?
  init(owner: BrowserModel) { self.owner = owner }

  func userContentController(
    _ userContentController: WKUserContentController,
    didReceive message: WKScriptMessage,
    replyHandler: @escaping @MainActor @Sendable (Any?, String?) -> Void
  ) {
    struct Request: Decodable {
      let method: String
      let params: BrowserJSON?
    }
    struct Response: Encodable {
      var result: BrowserJSON?
      var error: BrowserRPCError?
    }
    let finish: (Result<BrowserJSON, any Error>) -> Void = { result in
      let response: Response
      switch result {
      case .success(let value): response = Response(result: value)
      case .failure(let error):
        response = Response(error: error as? BrowserRPCError ?? .internalError)
      }
      guard let data = try? JSONEncoder().encode(response),
        let text = String(data: data, encoding: .utf8)
      else {
        replyHandler(nil, "Invalid response")
        return
      }
      replyHandler(text, nil)
    }
    // The page cannot supply its own origin or approve a connection. Reject subframes even if
    // they invoke the exposed WebKit handler directly instead of using the injected provider.
    guard let owner, message.webView === owner.webView, message.frameInfo.isMainFrame,
      let topURL = message.webView?.url
    else {
      finish(.failure(BrowserRPCError.unauthorized))
      return
    }
    let security = message.frameInfo.securityOrigin
    var components = URLComponents()
    components.scheme = security.protocol
    components.host = security.host
    if security.port != 0 { components.port = security.port }
    guard let frameURL = components.url, let origin = BrowserOrigin(url: frameURL),
      origin == BrowserOrigin(url: topURL), origin == owner.provider.origin
    else {
      finish(.failure(BrowserRPCError.unauthorized))
      return
    }
    guard let text = message.body as? String, text.utf8.count <= 65_536,
      let data = text.data(using: .utf8),
      let request = try? JSONDecoder().decode(Request.self, from: data),
      !request.method.isEmpty, request.method.count <= 128
    else {
      finish(.failure(BrowserRPCError.invalid))
      return
    }
    let document = owner.provider.document
    Task { @MainActor in
      do {
        finish(
          .success(
            try await owner.provider.request(
              method: request.method,
              params: request.params ?? .array([]), origin: origin, document: document)))
      } catch { finish(.failure(error)) }
    }
  }
}

struct BrowserWebView: UIViewRepresentable {
  let webView: WKWebView
  func makeUIView(context: Context) -> WKWebView { webView }
  func updateUIView(_ uiView: WKWebView, context: Context) {}
}
