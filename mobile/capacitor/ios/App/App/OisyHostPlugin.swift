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
    CAPPluginMethod(name: "navigationState", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "prepareBack", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "clearBack", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "finishRefresh", returnType: CAPPluginReturnPromise),
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
        "root": host.navigationRoot.rawValue, "requestId": host.navigationRequestID,
        "capabilities": [
          "nativeNavigation", "navigationState", "walletInteractions", "account", "delegation",
          "operationJournal",
        ],
      ])
    }
  }
  @objc func navigate(_ call: CAPPluginCall) {
    DispatchQueue.main.async { [weak self] in
      guard let self, self.valid(call), let value = call.getString("root"),
        let root = WalletRoot(rawValue: value), let host = self.host,
        host.acceptsLegacyNavigation, Set(call.options.keys) == ["version", "root"]
      else {
        call.reject("Unsupported root")
        return
      }
      host.select(root, notifyWeb: false)
      call.resolve()
    }
  }
  @objc func navigationState(_ call: CAPPluginCall) {
    DispatchQueue.main.async { [weak self] in
      guard let self, self.valid(call), let host = self.host,
        let state = WalletNavigationState(options: call.options),
        host.commitNavigation(state)
      else {
        call.reject("Unsupported or stale navigation state")
        return
      }
      call.resolve()
    }
  }
  @objc func prepareBack(_ call: CAPPluginCall) {
    DispatchQueue.main.async { [weak self] in
      guard let self, self.valid(call), let host = self.host,
        let request = WalletBackPreparation(options: call.options),
        host.walletInteractionsAllowed, request.root == host.walletRoot,
        let wallet = host.wallet
      else {
        call.reject("Unsupported back preparation")
        return
      }
      wallet.prepareBack(parent: request.parentURL) { success in
        if success { call.resolve() } else { call.reject("Parent view unavailable") }
      }
    }
  }
  @objc func clearBack(_ call: CAPPluginCall) {
    DispatchQueue.main.async { [weak self] in
      guard let self, self.valid(call), Set(call.options.keys) == ["version"],
        WalletNavigationState.integer(call.options["version"]) == 2
      else {
        call.reject("Unsupported back invalidation")
        return
      }
      self.host?.wallet?.interactions?.clearBack()
      call.resolve()
    }
  }
  @objc func finishRefresh(_ call: CAPPluginCall) {
    DispatchQueue.main.async { [weak self] in
      guard let self, self.valid(call),
        Set(call.options.keys) == ["version", "requestId"],
        WalletNavigationState.integer(call.options["version"]) == 2,
        let requestID = WalletNavigationState.integer(call.options["requestId"]),
        self.host?.wallet?.interactions?.finishRefresh(requestID: requestID) == true
      else {
        call.reject("Unsupported or stale refresh completion")
        return
      }
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
      guard let self, self.valid(call), Set(call.options.keys) == ["version", "request"],
        let session = self.host?.wallet?.session,
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
        case "readOperations":
          guard Set(request.keys) == ["method"] else { throw AuthError.invalidResponse }
          response = try session.readOperations().json()
        case "writeOperations":
          guard Set(request.keys) == ["method", "revision", "value"],
            let revision = request["revision"] as? String,
            let value = request["value"] as? String
          else { throw AuthError.invalidResponse }
          response = try session.writeOperations(revision: revision, value: value).json()
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
      } catch OperationJournalError.conflict {
        call.reject("Operation journal changed", "OPERATION_JOURNAL_CONFLICT")
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
  @MainActor func returnToParent() {
    guard let host, host.walletInteractionsAllowed,
      host.wallet?.session.isActive == true
    else { return }
    notifyListeners("back", data: ["version": 2])
  }
  @MainActor func refresh(requestID: Int) {
    guard let host, host.walletInteractionsAllowed,
      host.walletRoot == .wallet, host.wallet?.session.isActive == true
    else { return }
    notifyListeners("refresh", data: ["version": 2, "requestId": requestID])
  }
  @MainActor func select(_ root: String) {
    host?.requestWebScreen(root)
  }
  @MainActor func select(_ root: String, requestID: Int) {
    notifyListeners("navigate", data: ["version": 2, "root": root, "requestId": requestID])
  }
  override func shouldOverrideLoad(_ action: WKNavigationAction) -> NSNumber? {
    MainActor.assumeIsolated {
      guard let wallet = host?.wallet, wallet.hostPlugin === self else { return true }
      if WalletOriginPolicy.accepts(
        action.request.url, mainFrame: action.targetFrame?.isMainFrame == true)
      {
        host?.setBlockingPresentation(false)
        host?.resetNavigationForDocument()
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

/// Presentation metadata only. The native host never loads a caller-supplied URL.
struct WalletNavigationState {
  let root: WalletRoot
  let requestID: Int
  let revision: Int
  let backURL: URL?

  init?(options: [AnyHashable: Any]) {
    let keys = Set(options.keys)
    guard
      keys == ["version", "root", "requestId", "revision"]
        || keys == ["version", "root", "requestId", "revision", "backPath"]
    else { return nil }
    guard Self.integer(options["version"]) == 2,
      let value = options["root"] as? String, let root = WalletRoot(rawValue: value),
      let requestID = Self.integer(options["requestId"]),
      let revision = Self.integer(options["revision"])
    else { return nil }
    self.root = root
    self.requestID = requestID
    self.revision = revision
    if let path = options["backPath"] {
      guard let path = path as? String,
        let parent = WalletBackNavigationPolicy.parentURL(path: path, root: root)
      else { return nil }
      backURL = parent
    } else {
      backURL = nil
    }
  }
  static func integer(_ raw: Any?) -> Int? {
    guard let value = raw as? NSNumber,
      CFGetTypeID(value) != CFBooleanGetTypeID(),
      value.doubleValue >= 0, value.doubleValue <= 9_007_199_254_740_991,
      value.doubleValue.rounded(.towardZero) == value.doubleValue
    else { return nil }
    return value.intValue
  }
}

struct WalletBackPreparation {
  let root: WalletRoot
  let parentURL: URL

  init?(options: [AnyHashable: Any]) {
    guard Set(options.keys) == ["version", "root", "backPath"],
      WalletNavigationState.integer(options["version"]) == 2,
      let value = options["root"] as? String, let root = WalletRoot(rawValue: value),
      let path = options["backPath"] as? String,
      let parentURL = WalletBackNavigationPolicy.parentURL(path: path, root: root)
    else { return nil }
    self.root = root
    self.parentURL = parentURL
  }
}

enum WalletBackNavigationPolicy {
  static func parentURL(path: String, root: WalletRoot) -> URL? {
    guard root == .wallet || root == .search, path.utf8.count <= 2048,
      path.hasPrefix("/"), !path.hasPrefix("//"),
      let components = URLComponents(string: path), components.scheme == nil,
      components.host == nil, components.fragment == nil, components.path == "/"
    else { return nil }
    let items = components.queryItems ?? []
    guard Set(items.map(\.name)).count == items.count,
      items.allSatisfy({ item in
        switch item.name {
        case "network": return item.value.map { !$0.isEmpty && $0.utf8.count <= 256 } == true
        case "search": return item.value == "true"
        default: return false
        }
      }),
      items.contains(where: { $0.name == "search" }) == (root == .search),
      let url = URL(string: "capacitor://localhost" + path),
      WalletOriginPolicy.accepts(url, mainFrame: true)
    else { return nil }
    return url
  }
  static func isToken(_ url: URL?) -> Bool {
    guard WalletOriginPolicy.accepts(url, mainFrame: true), let url,
      let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
      components.path == "/transactions/"
    else { return false }
    let items = components.queryItems ?? []
    return ["network", "token"].allSatisfy { name in
      items.contains { $0.name == name && $0.value?.isEmpty == false }
    }
  }
}
