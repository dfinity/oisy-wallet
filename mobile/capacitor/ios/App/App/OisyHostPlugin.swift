@preconcurrency import Capacitor
import WebKit

/// Fixed v2 commands, never an arbitrary signing/network proxy.
@objc(OisyHostPlugin)
final class OisyHostPlugin: CAPPlugin, CAPBridgedPlugin, @unchecked Sendable {
  let identifier = "OisyHostPlugin"
  let jsName = "OisyHost"
  let pluginMethods: [CAPPluginMethod] = [
    CAPPluginMethod(name: "ready", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "navigate", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "presentation", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "openAccount", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "wallet", returnType: CAPPluginReturnPromise),
  ]
  @MainActor weak var host: ShellViewController?
  @MainActor private let runtimeId = UUID().uuidString

  @objc func ready(_ call: CAPPluginCall) {
    DispatchQueue.main.async { [weak self] in
      guard let self, let host = self.host, self.valid(call) else {
        call.reject("Unsupported host request")
        return
      }
      call.resolve([
        "version": 2, "mode": "audit-read-only", "runtimeId": self.runtimeId,
        "root": host.walletRoot.rawValue,
        "capabilities": ["nativeNavigation", "account", "delegation"],
      ])
    }
  }
  @objc func navigate(_ call: CAPPluginCall) {
    DispatchQueue.main.async { [weak self] in
      guard let self, self.valid(call), let value = call.getString("root"),
        let root = WalletRoot(rawValue: value), let host = self.host
      else {
        call.reject("Unsupported root")
        return
      }
      host.select(root, notifyWeb: false)
      call.resolve()
    }
  }
  @objc func presentation(_ call: CAPPluginCall) {
    DispatchQueue.main.async { [weak self] in
      guard let self, self.valid(call),
        Set(call.options.keys) == ["version", "blocking"],
        let blocking = call.getBool("blocking"), let host = self.host
      else {
        call.reject("Unsupported presentation")
        return
      }
      host.setBlockingPresentation(blocking)
      call.resolve()
    }
  }
  @objc func openAccount(_ call: CAPPluginCall) {
    DispatchQueue.main.async { [weak self] in
      guard let self, self.valid(call), let host = self.host else {
        call.reject("Unsupported host request")
        return
      }
      host.openAccount()
      call.resolve()
    }
  }
  @objc func wallet(_ call: CAPPluginCall) {
    DispatchQueue.main.async { [weak self] in
      guard let self, self.valid(call), let session = self.host?.wallet?.session,
        let request = call.getObject("request"),
        let method = request["method"] as? String
      else {
        call.reject("Unsupported wallet request")
        return
      }
      do {
        let response: String
        switch method {
        case "authorize":
          guard Set(request.keys) == ["method", "publicKey"],
            let encoded = request["publicKey"] as? String, encoded.count <= 128,
            let publicKey = Data(base64Encoded: encoded)
          else { throw AuthError.invalidResponse }
          response = try session.authorize(publicKey: publicKey)
        case "account":
          guard Set(request.keys).isSubset(of: ["method", "grantID", "principal", "address"]),
            let grantID = request["grantID"] as? String,
            let principal = request["principal"] as? String,
            request["address"] == nil || request["address"] is String
          else {
            throw AuthError.invalidResponse
          }
          try session.setAccount(
            grantID: grantID, principal: principal,
            address: request["address"] as? String)
          response = "{}"
        case "signOut":
          guard Set(request.keys) == ["method"] else { throw AuthError.invalidResponse }
          call.resolve(["response": "{}"])
          self.host?.auth.signOut()
          self.host?.resume()
          return
        case "sessionExpired":
          guard Set(request.keys) == ["method"] else { throw AuthError.invalidResponse }
          // The trusted page may end its session just like explicit logout. Native
          // deadlines still enforce expiry independently when JS is suspended.
          call.resolve(["response": "{}"])
          self.host?.auth.expire(session.native)
          self.host?.resume()
          return
        default: throw AuthError.invalidResponse
        }
        call.resolve(["response": response])
      } catch { call.reject("Wallet session unavailable") }
    }
  }
  @MainActor private func valid(_ call: CAPPluginCall) -> Bool {
    guard call.getInt("version") == 2, let wallet = host?.wallet,
      wallet.hostPlugin === self,
      WalletOriginPolicy.accepts(bridge?.webView?.url, mainFrame: true)
    else { return false }
    return !wallet.session.checkExpiration()
  }
  @MainActor func select(_ root: String) {
    notifyListeners("navigate", data: ["version": 2, "root": root])
  }
  override func shouldOverrideLoad(_ action: WKNavigationAction) -> NSNumber? {
    MainActor.assumeIsolated {
      guard let wallet = host?.wallet, wallet.hostPlugin === self else { return true }
      if WalletOriginPolicy.accepts(
        action.request.url, mainFrame: action.targetFrame?.isMainFrame == true)
      {
        host?.setBlockingPresentation(false)
        wallet.session.resetDocument()
        return wallet.session.isActive ? nil : true
      }
      if action.navigationType == .linkActivated, action.sourceFrame.isMainFrame,
        let url = action.request.url, url.scheme == "https", url.host != nil,
        url.user == nil, url.password == nil
      {
        UIApplication.shared.open(url)
      }
      return true
    }
  }
}

enum WalletRoot: String, CaseIterable { case wallet, activity, search, notes, earn, borrow }
