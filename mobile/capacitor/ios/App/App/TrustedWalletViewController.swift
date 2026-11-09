import UIKit
import WebKit

typealias WalletOriginPolicy = LiveWalletOriginPolicy

#if DEBUG
  /// Supplied only by XCTest. The production target has no bundled wallet fallback.
  struct WalletTestSource {
    let handler: WKURLSchemeHandler
    var origin: URL? { URL(string: "capacitor://localhost") }
  }
#endif

@MainActor
final class TrustedWalletViewController: UIViewController, WKNavigationDelegate {
  let hostPlugin: LiveWalletBridge
  let session: WalletSession
  private(set) var webView: WKWebView?
  private(set) var isReady = false
  private(set) var nativeSheet: WalletSheetCoordinator?
  private var webConstraints: [NSLayoutConstraint] = []
  private var closed = false
  private var timeout: Task<Void, Never>?
  private let cover = UIView()
  private let message = UILabel()
  private let spinner = UIActivityIndicatorView(style: .large)
  private let retry = UIButton(type: .system)
  private var navigationObservations: [NSKeyValueObservation] = []
  private var approvedBackURL: URL?
  private var permitsBackNavigation = false
  private var permitsRefresh = false
  private(set) var interactions: WalletInteractions?
  #if DEBUG
    var bootstrapScript: String?
    var testSource: WalletTestSource?
  #endif
  var origin: URL? {
    #if DEBUG
      if let testSource { return testSource.origin }
    #endif
    return WalletOriginPolicy.baseURL
  }

  init(session: WalletSession) {
    self.session = session
    hostPlugin = LiveWalletBridge(session: session)
    super.init(nibName: nil, bundle: nil)
  }
  required init?(coder: NSCoder) { nil }

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .systemBackground
    let configuration = WKWebViewConfiguration()
    configuration.websiteDataStore = .nonPersistent()
    configuration.preferences.javaScriptCanOpenWindowsAutomatically = false
    #if DEBUG
      if let testSource {
        configuration.setURLSchemeHandler(testSource.handler, forURLScheme: "capacitor")
        hostPlugin.testOrigin = testSource.origin
      }
    #endif
    configuration.userContentController.addScriptMessageHandler(
      hostPlugin, contentWorld: .page, name: "oisyHost")
    let web = WKWebView(frame: .zero, configuration: configuration)
    webView = web
    hostPlugin.webView = web
    hostPlugin.onReady = { [weak self] in self?.hostReady() }
    web.navigationDelegate = self
    moveWebView(to: view)
    nativeSheet = WalletSheetCoordinator(owner: self, webView: web)
    web.scrollView.bounces = false
    web.scrollView.contentInsetAdjustmentBehavior = .never
    web.allowsBackForwardNavigationGestures = false
    web.isInspectable = _isDebugAssertConfiguration()
    interactions = WalletInteractions(
      webView: web, origin: origin,
      onBack: { [weak self] in self?.hostPlugin.returnToParent() },
      onRefresh: { [weak self] requestID in self?.hostPlugin.refresh(requestID: requestID) })
    registerForTraitChanges([UITraitUserInterfaceStyle.self]) {
      (controller: TrustedWalletViewController, _: UITraitCollection) in
      controller.interactions?.clearBack()
    }
    navigationObservations = [
      web.observe(\.url, options: [.new]) { [weak self] _, _ in
        MainActor.assumeIsolated { self?.refreshBackNavigation() }
      },
      web.observe(\.canGoBack, options: [.new]) { [weak self] _, _ in
        MainActor.assumeIsolated { self?.refreshBackNavigation() }
      },
      web.observe(\.canGoForward, options: [.new]) { [weak self] _, _ in
        MainActor.assumeIsolated { self?.refreshBackNavigation() }
      },
    ]
    configureCover()
    loadWallet()
  }

  func moveWebView(to container: UIView) {
    guard let webView else { return }
    NSLayoutConstraint.deactivate(webConstraints)
    webView.removeFromSuperview()
    webView.translatesAutoresizingMaskIntoConstraints = false
    if container === view {
      container.insertSubview(webView, at: 0)
    } else {
      container.addSubview(webView)
    }
    webConstraints = [
      webView.leadingAnchor.constraint(equalTo: container.leadingAnchor),
      webView.trailingAnchor.constraint(equalTo: container.trailingAnchor),
      webView.topAnchor.constraint(equalTo: container.topAnchor),
      webView.bottomAnchor.constraint(equalTo: container.bottomAnchor),
    ]
    NSLayoutConstraint.activate(webConstraints)
  }

  private func configureCover() {
    cover.backgroundColor = .systemBackground
    cover.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(cover)
    message.font = .preferredFont(forTextStyle: .body)
    message.adjustsFontForContentSizeCategory = true
    message.textAlignment = .center
    message.numberOfLines = 0
    var configuration = UIButton.Configuration.filled()
    configuration.title = NSLocalizedString("wallet.retry", comment: "Retry loading the wallet")
    configuration.cornerStyle = .capsule
    retry.configuration = configuration
    retry.accessibilityIdentifier = "wallet.retry"
    retry.addTarget(self, action: #selector(loadWallet), for: .touchUpInside)
    let stack = UIStackView(arrangedSubviews: [spinner, message, retry])
    stack.axis = .vertical
    stack.alignment = .center
    stack.spacing = 24
    stack.translatesAutoresizingMaskIntoConstraints = false
    cover.addSubview(stack)
    NSLayoutConstraint.activate([
      cover.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      cover.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      cover.topAnchor.constraint(equalTo: view.topAnchor),
      cover.bottomAnchor.constraint(equalTo: view.bottomAnchor),
      stack.centerYAnchor.constraint(equalTo: cover.safeAreaLayoutGuide.centerYAnchor),
      stack.leadingAnchor.constraint(
        equalTo: cover.safeAreaLayoutGuide.leadingAnchor, constant: 32),
      stack.trailingAnchor.constraint(
        equalTo: cover.safeAreaLayoutGuide.trailingAnchor, constant: -32),
      retry.heightAnchor.constraint(greaterThanOrEqualToConstant: 48),
      retry.widthAnchor.constraint(greaterThanOrEqualToConstant: 160),
    ])
  }

  @objc func loadWallet() {
    guard !closed, !session.checkExpiration(), let url = origin else { return }
    // Explicit start/retry only. A release or foreground event must not interrupt a pending operation.
    webView?.load(
      URLRequest(url: url.appendingPathComponent("/"), cachePolicy: .reloadRevalidatingCacheData))
  }

  private func beginDocument() -> Bool {
    nativeSheet?.reset()
    hostPlugin.isAvailable = false
    isReady = false
    timeout?.cancel()
    interactions?.invalidate()
    hostPlugin.host?.setBlockingPresentation(false)
    hostPlugin.host?.resetNavigationForDocument()
    session.resetDocument()
    guard !closed, session.isActive, let script = try? hostPlugin.bootstrap() else { return false }
    let controller = webView?.configuration.userContentController
    controller?.removeAllUserScripts()
    controller?.addUserScript(script)
    #if DEBUG
      if let bootstrapScript {
        controller?.addUserScript(
          WKUserScript(
            source: bootstrapScript,
            injectionTime: .atDocumentStart, forMainFrameOnly: true))
      }
    #endif
    hostPlugin.isAvailable = true
    cover.isHidden = false
    retry.isHidden = true
    message.text = NSLocalizedString("wallet.loading", comment: "Loading the live wallet")
    spinner.startAnimating()
    let document = session.documentID
    timeout = Task { @MainActor [weak self] in
      do { try await Task.sleep(for: .seconds(30)) } catch { return }
      guard let self, self.session.documentID == document, !self.isReady else { return }
      self.showFailure()
    }
    return true
  }

  func hostReady() {
    guard hostPlugin.isAvailable, !session.checkExpiration() else { return }
    timeout?.cancel()
    timeout = nil
    isReady = true
    cover.isHidden = true
    spinner.stopAnimating()
  }

  private func showFailure() {
    nativeSheet?.reset()
    guard !closed, !session.checkExpiration() else { return }
    timeout?.cancel()
    timeout = nil
    hostPlugin.isAvailable = false
    isReady = false
    session.resetDocument()
    interactions?.invalidate()
    hostPlugin.host?.resetNavigationForDocument()
    webView?.stopLoading()
    // Discard the failed document and its workers, without ending the native session or journal.
    webView?.loadHTMLString("", baseURL: nil)
    cover.isHidden = false
    retry.isHidden = false
    spinner.stopAnimating()
    message.text = NSLocalizedString("wallet.unavailable", comment: "Live wallet unavailable")
  }

  func webView(
    _ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
    decisionHandler: @escaping @MainActor @Sendable (WKNavigationActionPolicy) -> Void
  ) {
    if !hostPlugin.isAvailable, action.request.url?.absoluteString == "about:blank" {
      decisionHandler(.allow)
      return
    }
    // Subframes may render web content, but never receive the bootstrap or use native privileges.
    if action.targetFrame?.isMainFrame == false {
      decisionHandler(.allow)
      return
    }
    if WalletOriginPolicy.accepts(
      action.request.url, mainFrame: action.targetFrame?.isMainFrame == true, origin: origin),
      beginDocument()
    {
      decisionHandler(.allow)
      return
    }
    if action.navigationType == .linkActivated, action.sourceFrame.isMainFrame,
      let url = action.request.url, url.scheme == "https", url.host != nil,
      url.user == nil, url.password == nil
    {
      UIApplication.shared.open(url)
    } else if action.targetFrame?.isMainFrame == true {
      showFailure()
    }
    decisionHandler(.cancel)
  }

  func webView(
    _ webView: WKWebView, decidePolicyFor response: WKNavigationResponse,
    decisionHandler: @escaping @MainActor @Sendable (WKNavigationResponsePolicy) -> Void
  ) {
    decideResponse(
      response.response, mainFrame: response.isForMainFrame, decisionHandler: decisionHandler)
  }

  func decideResponse(
    _ response: URLResponse, mainFrame: Bool,
    decisionHandler: @MainActor @Sendable (WKNavigationResponsePolicy) -> Void
  ) {
    guard mainFrame else {
      decisionHandler(.allow)
      return
    }
    if !hostPlugin.isAvailable, response.url?.absoluteString == "about:blank" {
      decisionHandler(.allow)
      return
    }
    var successful =
      (response as? HTTPURLResponse).map { (200..<300).contains($0.statusCode) } ?? false
    #if DEBUG
      // WebKit represents custom-scheme XCTest fixtures as URLResponse, without HTTP status.
      if testSource != nil, response.url?.scheme == "capacitor" { successful = true }
    #endif
    guard WalletOriginPolicy.accepts(response.url, mainFrame: true, origin: origin),
      successful, response.mimeType == "text/html"
    else {
      decisionHandler(.cancel)
      showFailure()
      return
    }
    decisionHandler(.allow)
  }
  func webView(
    _ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!,
    withError error: Error
  ) {
    if (error as NSError).code != NSURLErrorCancelled { showFailure() }
  }
  func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
    if (error as NSError).code != NSURLErrorCancelled { showFailure() }
  }
  func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { showFailure() }
  func setBackNavigation(parent: URL?, enabled: Bool, refreshEnabled: Bool = false) {
    approvedBackURL = parent
    permitsBackNavigation = enabled
    permitsRefresh = refreshEnabled
    refreshBackNavigation()
  }
  override func viewDidLayoutSubviews() {
    super.viewDidLayoutSubviews()
    refreshBackNavigation()
  }
  func prepareBack(parent: URL, completion: @escaping (Bool) -> Void) {
    guard let webView, let interactions, session.isActive,
      webView.url == parent || webView.backForwardList.backItem?.url == parent
    else {
      completion(false)
      return
    }
    interactions.capture(parent: parent, completion: completion)
  }
  private func refreshBackNavigation() {
    guard let webView else { return }
    let allowed = isReady && permitsBackNavigation && session.isActive
    let isRoot =
      WalletOriginPolicy.accepts(webView.url, mainFrame: true, origin: origin)
      && webView.url.flatMap {
        WalletBackNavigationPolicy.parentURL(
          path: $0.path + ($0.query.map { "?" + $0 } ?? ""), root: .wallet, origin: origin)
      } != nil
    interactions?.update(
      backAllowed: allowed && WalletBackNavigationPolicy.isToken(webView.url, origin: origin)
        && approvedBackURL != nil && approvedBackURL == interactions?.parentURL
        && webView.backForwardList.backItem?.url == approvedBackURL
        && webView.backForwardList.forwardItem == nil,
      refreshAllowed: allowed && permitsRefresh && isRoot,
      temporaryResize: nativeSheet?.identifier != nil)
    webView.allowsBackForwardNavigationGestures = false
  }
  func close() {
    closed = true
    hostPlugin.isAvailable = false
    isReady = false
    timeout?.cancel()
    timeout = nil
    nativeSheet?.reset()
    nativeSheet = nil
    interactions?.close()
    interactions = nil
    navigationObservations.removeAll()
    session.close()
    hostPlugin.host = nil
    hostPlugin.webView = nil
    hostPlugin.onReady = nil
    webView?.stopLoading()
    webView?.configuration.userContentController.removeAllScriptMessageHandlers()
    webView?.configuration.userContentController.removeAllUserScripts()
    webView?.navigationDelegate = nil
    webView?.loadHTMLString("", baseURL: nil)
  }
}
