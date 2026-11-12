import Foundation

/// HTTPS wallet trust boundary. The derivation origin is build-owned configuration.
enum LiveWalletOriginPolicy {
  static var baseURL: URL? {
    guard let environment = try? AppEnvironment.load(),
      let url = URL(string: environment.derivationOrigin), url.scheme == "https",
      url.host != nil, url.port == nil, url.user == nil, url.password == nil,
      url.path.isEmpty, url.query == nil, url.fragment == nil
    else { return nil }
    return url
  }
  static func accepts(_ url: URL?, mainFrame: Bool, origin: URL? = baseURL) -> Bool {
    guard mainFrame, let url, let origin,
      let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
    else { return false }
    return url.scheme == origin.scheme && url.host == origin.host
      && url.port == nil && url.user == nil && url.password == nil
      && [
        "", "/", "/index.html", "/activity/", "/transactions/", "/settings/", "/notes/",
        "/earn/", "/borrow/",
      ].contains(components.path)
      && (components.queryItems ?? []).allSatisfy {
        ["network", "token", "search"].contains($0.name)
      }
  }
}
