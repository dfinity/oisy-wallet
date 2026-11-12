import AuthenticationServices
import SwiftUI
import UIKit
import WebKit

// A separate, unassociated app. Uses a synthetic fragment, never II or wallet credentials.
@main
struct CallbackProbeApp: App {
  var body: some Scene {
    WindowGroup { ProbeHost() }
  }
}

private struct ProbeHost: UIViewControllerRepresentable {
  func makeUIViewController(context: Context) -> CallbackProbe { CallbackProbe() }
  func updateUIViewController(_ controller: CallbackProbe, context: Context) {}
}

@MainActor
final class CallbackProbe: UIViewController,
  ASWebAuthenticationPresentationContextProviding, WKNavigationDelegate
{
  private let callbackHost = "audit.oisy.com"
  private let callbackPath = "/signer-callback"
  private let marker = "#oisy-callback-probe=synthetic-not-a-credential"
  private let status = UILabel()
  private var session: ASWebAuthenticationSession?
  private var web: WKWebView?
  private var started = false

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .systemBackground
    status.text = "Callback security check. No wallet credentials are used."
    status.numberOfLines = 0
    let stack = UIStackView(arrangedSubviews: [status])
    stack.axis = .vertical
    stack.spacing = 20
    for (title, selector) in [
      ("Check unassociated HTTPS callback", #selector(checkHTTPS)),
      ("Check callback landing page", #selector(checkPage)),
    ] {
      let button = UIButton(type: .system)
      button.setTitle(title, for: .normal)
      button.addTarget(self, action: selector, for: .touchUpInside)
      stack.addArrangedSubview(button)
    }
    stack.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(stack)
    NSLayoutConstraint.activate([
      stack.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 24),
      stack.trailingAnchor.constraint(
        equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -24),
      stack.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 24),
    ])
  }

  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    UIApplication.shared.isIdleTimerDisabled = true
    guard !started else { return }
    started = true
    Task { @MainActor [weak self] in
      guard let self else { return }
      for _ in 0..<100 {
        if view.window?.windowScene?.activationState == .foregroundActive {
          if ProcessInfo.processInfo.arguments.contains("--https") { checkHTTPS() }
          if ProcessInfo.processInfo.arguments.contains("--page") { checkPage() }
          return
        }
        try? await Task.sleep(for: .milliseconds(100))
      }
      report("INCONCLUSIVE_INACTIVE_SCENE", details: "unlock and launch the test app again")
    }
  }

  override func viewDidDisappear(_ animated: Bool) {
    super.viewDidDisappear(animated)
    UIApplication.shared.isIdleTimerDisabled = false
  }

  private var testURL: URL? {
    URL(string: "https://" + callbackHost + callbackPath + marker)
  }

  @objc private func checkHTTPS() {
    guard session == nil, let url = testURL else { return }
    let session = ASWebAuthenticationSession(
      url: url, callback: .https(host: callbackHost, path: callbackPath)
    ) { [weak self] url, error in
      Task { @MainActor [weak self] in
        guard let self else { return }
        self.session = nil
        let error = error as NSError?
        let description = [
          error?.localizedDescription ?? "",
          error?.userInfo[NSDebugDescriptionErrorKey] as? String ?? "",
        ].joined(separator: " ")
        let associationRejected =
          url == nil
          && error?.domain == ASWebAuthenticationSessionErrorDomain
          && (description.localizedCaseInsensitiveContains("not associated")
            || description.localizedCaseInsensitiveContains("webcredentials"))
        self.report(
          associationRejected
            ? "PASS_HTTPS_ASSOCIATION_REJECTED" : "INCONCLUSIVE_OR_CALLBACK_RECEIVED",
          details:
            "callbackReceived=\(url != nil); errorDomain=\(error?.domain ?? "none"); errorCode=\(error?.code ?? 0); \(description)"
        )
      }
    }
    session.presentationContextProvider = self
    self.session = session
    report("HTTPS_STARTED", details: "started=\(session.start())")
  }

  func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
    view.window ?? ASPresentationAnchor()
  }

  @objc private func checkPage() {
    guard let url = testURL else { return }
    let configuration = WKWebViewConfiguration()
    configuration.websiteDataStore = .nonPersistent()
    let web = WKWebView(frame: view.bounds, configuration: configuration)
    web.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    web.navigationDelegate = self
    view.addSubview(web)
    self.web = web
    web.load(URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData))
  }

  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    Task { @MainActor [weak self, weak webView] in
      guard let self, let webView else { return }
      for _ in 0..<100 {
        do {
          let cleared =
            try await webView.evaluateJavaScript("location.hash === '' && location.search === ''")
            as? Bool
          let relay =
            try await webView.evaluateJavaScript(
              "Array.from(document.querySelectorAll('a[href]')).some(a => a.href.startsWith('oisy:'))"
            ) as? Bool
          if relay == true {
            self.report("FAIL_LEGACY_RELAY_PRESENT", details: "synthetic fragment only")
            return
          }
          if cleared == true {
            self.report(
              "PASS_PAGE_DISCARDS_RESPONSE", details: "fragmentCleared=true; legacyLink=false")
            return
          }
          try await Task.sleep(for: .milliseconds(100))
        } catch {
          self.report("INCONCLUSIVE_PAGE_ERROR", details: "JavaScript evaluation failed")
          return
        }
      }
      self.report("INCONCLUSIVE_PAGE_TIMEOUT", details: "response was not discarded")
    }
  }

  func webView(
    _ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
    decisionHandler: @escaping @MainActor @Sendable (WKNavigationActionPolicy) -> Void
  ) {
    guard let url = navigationAction.request.url,
      url.scheme == "https", url.host == callbackHost,
      url.path == callbackPath || url.path == callbackPath + "/"
    else {
      report("FAIL_CALLBACK_LEFT_ORIGIN", details: "outbound navigation blocked; URL not logged")
      decisionHandler(.cancel)
      return
    }
    decisionHandler(.allow)
  }

  private func report(_ result: String, details: String) {
    // The only URL loaded by this fixture contains the fixed synthetic marker above.
    // Never adapt this logger to print real authentication response URLs.
    status.text = result + "\n" + details
    print("OISY_CALLBACK_PROBE " + result + " " + details)
  }
}
