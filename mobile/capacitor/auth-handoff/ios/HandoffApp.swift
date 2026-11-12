import IcpSdkAuth
import IcpSdkCore
import SwiftUI
import WebKit

@main
struct HandoffApp: App {
  var body: some Scene {
    WindowGroup { HandoffScreen() }
  }
}

// Developer-only M1 host. It never loads a wallet or exposes a general signer.
private struct HandoffScreen: View {
  @SwiftUI.State private var model = HandoffModel()

  var body: some View {
    VStack(alignment: .leading, spacing: 16) {
      Text("OISY · SDK handoff test").font(.title2.bold())
      Text("Uses audit identity. Verifies a signed whoami request; no funds are moved.")
        .font(.footnote).foregroundStyle(.secondary)
      Text(model.status).font(.callout).accessibilityIdentifier("handoff-status")
      HStack {
        Button("Sign in & verify") { Task { await model.signIn() } }
          .buttonStyle(.borderedProminent).disabled(model.busy)
        Button("Reload test") { model.reload() }.disabled(!model.authenticated || model.busy)
        Button("Sign out") { Task { await model.signOut() } }.disabled(model.busy)
      }
      TestPage(model: model)
    }
    .padding()
    .task { await model.restore() }
  }
}

private struct TestPage: UIViewRepresentable {
  let model: HandoffModel
  func makeUIView(context: Context) -> WKWebView { model.webView }
  func updateUIView(_ uiView: WKWebView, context: Context) {}
}

@MainActor
@Observable
private final class HandoffModel: NSObject, WKScriptMessageHandlerWithReply, WKNavigationDelegate {
  private(set) var status = "Ready for an audit sign-in."
  private(set) var busy = false
  private(set) var authenticated = false
  private var auth: IcpSdkAuth.AuthClient?
  private var generation = UUID()
  private var consumed = false
  private let page = Bundle.main.url(forResource: "handoff", withExtension: "html", subdirectory: "Web")
  private(set) var webView: WKWebView!

  override init() {
    super.init()
    let configuration = WKWebViewConfiguration()
    configuration.websiteDataStore = .nonPersistent()
    configuration.userContentController.addScriptMessageHandler(self, contentWorld: .page, name: "session")
    webView = WKWebView(frame: .zero, configuration: configuration)
    webView.navigationDelegate = self
    do {
      // SDK namespace slots contain ':', which Apple storage's filename validator
      // rejects at this pinned revision. Separate directories and key tags isolate
      // this test without changing the SDK or touching the installed wallet's state.
      let support = try FileManager.default.url(for: .applicationSupportDirectory,
        in: .userDomainMask, appropriateFor: nil, create: true)
        .appendingPathComponent("oisy-sdk-m1", isDirectory: true)
      auth = try IcpSdkAuth.AuthClient(
        callbackUrl: "https://audit.oisy.com/signer-callback",
        credentials: AppleCredentialStorage(configuration: .init(
          keyTagPrefix: "org.dfinity.oisy.sdk-m1.",
          directory: support.appendingPathComponent("credentials", isDirectory: true))),
        state: AppleStateStorage(configuration: .init(
          directory: support.appendingPathComponent("state", isDirectory: true),
          derivationOrigin: "https://audit.oisy.com")),
        derivationOrigin: "https://audit.oisy.com")
    } catch { status = "SDK setup failed." }
  }

  func restore() async {
    guard let auth, !busy else { return }
    busy = true
    defer { busy = false; reload() }
    do {
      try await auth.restore()
      authenticated = auth.isAuthenticated()
      status = authenticated ? "Restored the original session. Verifying the web session…" : "Ready for an audit sign-in."
    } catch { status = "Stored session is unavailable. Check platform storage and retry." }
  }

  func signIn() async {
    guard let auth, !busy else { return }
    busy = true
    authenticated = false
    generation = UUID()
    let pending = generation
    status = "Opening Internet Identity…"
    defer { busy = false }
    do {
      _ = try await auth.signIn(maxTimeToLiveNs: 3_600_000_000_000)
      guard pending == generation, !Task.isCancelled else { return }
      authenticated = true
      status = "Native sign-in completed. Verifying the web session…"
      reload()
    } catch {
      guard pending == generation else { return }
      status = "Sign-in did not complete. Check audit association and signing configuration."
    }
  }

  func signOut() async {
    guard !busy else { return }
    busy = true
    authenticated = false
    generation = UUID()
    reload()
    status = "Signing out…"
    defer { busy = false }
    do {
      try await auth?.signOut()
      status = "Signed out."
    } catch { status = "Signed out locally; remote revocation could not finish." }
  }

  func reload() {
    generation = UUID()
    consumed = false
    guard let page else { status = "Test page is missing."; return }
    webView.loadFileURL(page, allowingReadAccessTo: page.deletingLastPathComponent())
  }

  private struct Request: Decodable {
    let version: Int
    let requestID: UUID
    let publicKey: String
  }
  private struct Reply: Encodable {
    let version: Int
    let requestID: UUID
    let chain: DelegationJSON
    let expectedAccount: String
    let expiresAtMs: UInt64
  }

  func userContentController(_ userContentController: WKUserContentController,
    didReceive message: WKScriptMessage,
    replyHandler: @escaping @MainActor (Any?, String?) -> Void
  ) {
    guard message.name == "session", message.webView === webView, message.frameInfo.isMainFrame,
      let page, webView.url == page, message.frameInfo.request.url == page,
      authenticated, !busy, !consumed, let auth,
      let body = message.body as? [String: Any], Set(body.keys) == ["version", "requestID", "publicKey"],
      let bytes = try? JSONSerialization.data(withJSONObject: body), bytes.count <= 4096,
      let request = try? JSONDecoder().decode(Request.self, from: bytes), request.version == 1,
      let key = Data(base64Encoded: request.publicKey), !key.isEmpty, key.count <= 512
    else { replyHandler(nil, "Session handoff is unavailable."); return }
    consumed = true
    let pending = generation
    Task { @MainActor in
      do {
        guard case .signedIn(let account, let expiry) = auth.status() else {
          replyHandler(nil, "Session has ended."); return
        }
        // Round down to the web's millisecond precision and retain that same bound.
        let deadline = expiry / 1_000_000
        let chain = try await auth.delegateSession(to: key, expiresAtNs: deadline * 1_000_000)
        guard pending == generation, authenticated, webView.url == page else {
          replyHandler(nil, "Session changed."); return
        }
        let reply = Reply(version: 1, requestID: request.requestID, chain: DelegationJSON(chain),
          expectedAccount: try principalToText(bytes: account), expiresAtMs: deadline)
        let data = try JSONEncoder().encode(reply)
        guard data.count <= 65_536 else { replyHandler(nil, "Handoff exceeded its limit."); return }
        replyHandler(try JSONSerialization.jsonObject(with: data), nil)
        status = "Session delegated. The web result appears below."
      } catch { replyHandler(nil, "Session delegation failed.") }
    }
  }

  func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
    decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
  ) {
    guard action.targetFrame?.isMainFrame == true, action.request.url == page else {
      decisionHandler(.cancel); return
    }
    decisionHandler(.allow)
  }

  func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
    generation = UUID()
    consumed = true
    status = "The test page stopped. Reload it to create a fresh bounded handoff."
  }
}
