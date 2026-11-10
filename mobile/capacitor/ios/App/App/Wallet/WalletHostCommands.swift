import Foundation

@MainActor
struct WalletHostReply {
  let value: [String: Any]
  var afterDelivery: (() -> Void)? = nil
}

enum WalletHostCommandError: Error { case unavailable, invalid }

/// Transport-independent command handling. A document's authority ends at reload.
@MainActor
final class WalletHostCommands {
  weak var host: ShellViewController?
  private let runtimeID = UUID().uuidString

  func execute(method: String, options envelope: [AnyHashable: Any]) async throws -> WalletHostReply
  {
    guard let host, let wallet = host.wallet, !wallet.session.checkExpiration(),
      WalletNavigationState.integer(envelope["version"]) == 2
    else { throw WalletHostCommandError.unavailable }
    let session = wallet.session
    let document = session.documentID
    var options = envelope
    if method != "ready" {
      guard let token = options.removeValue(forKey: "documentId") as? String,
        token == document.uuidString
      else { throw WalletHostCommandError.invalid }
    }
    let result: WalletHostReply
    switch method {
    case "ready":
      guard Set(options.keys) == ["version"] else { throw WalletHostCommandError.invalid }
      let environment = try AppEnvironment.load()
      result = WalletHostReply(value: [
        "version": 2, "mode": "audit-read-only", "runtimeId": runtimeID,
        "documentId": document.uuidString, "environment": environment.environment,
        "hostVersion": Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString")
          as? String ?? "0",
        "root": host.navigationRoot.rawValue, "requestId": host.navigationRequestID,
        "capabilities": [
          "nativeNavigation", "navigationState", "walletInteractions", "account",
          "delegation", "operationJournal", "sessionHandoff", "documentBinding", "nativeSheets",
          "contentSizedSheets",
        ],
      ])
    case "navigate":
      guard Set(options.keys) == ["version", "root"],
        let value = options["root"] as? String, let root = WalletRoot(rawValue: value),
        host.acceptsLegacyNavigation
      else { throw WalletHostCommandError.invalid }
      host.select(root, notifyWeb: false)
      result = WalletHostReply(value: [:])
    case "navigationState":
      guard let state = WalletNavigationState(options: options, origin: wallet.origin),
        host.commitNavigation(state)
      else { throw WalletHostCommandError.invalid }
      result = WalletHostReply(value: [:])
    case "prepareBack":
      guard let request = WalletBackPreparation(options: options, origin: wallet.origin),
        host.walletInteractionsAllowed, request.root == host.walletRoot
      else { throw WalletHostCommandError.invalid }
      let captured = await withCheckedContinuation { continuation in
        wallet.prepareBack(parent: request.parentURL) { continuation.resume(returning: $0) }
      }
      guard captured else { throw WalletHostCommandError.unavailable }
      result = WalletHostReply(value: [:])
    case "clearBack":
      guard Set(options.keys) == ["version"] else { throw WalletHostCommandError.invalid }
      wallet.interactions?.clearBack()
      result = WalletHostReply(value: [:])
    case "finishRefresh":
      guard Set(options.keys) == ["version", "requestId"],
        let request = WalletNavigationState.integer(options["requestId"]),
        wallet.interactions?.finishRefresh(requestID: request) == true
      else { throw WalletHostCommandError.invalid }
      result = WalletHostReply(value: [:])
    case "sheet":
      let keys = Set(options.keys)
      let baseKeys: Set<AnyHashable> = ["version", "id", "phase", "size"]
      guard keys == baseKeys || keys == baseKeys.union(["contentHeight"]),
        let rawID = options["id"] as? String, let id = UUID(uuidString: rawID),
        let phase = options["phase"] as? String,
        let rawSize = options["size"] as? String,
        let size = WalletSheetCoordinator.Size(rawValue: rawSize),
        let sheet = wallet.nativeSheet
      else { throw WalletHostCommandError.invalid }
      let contentHeight = WalletNavigationState.integer(options["contentHeight"])
      if options["contentHeight"] != nil {
        guard phase == "present" || phase == "resize", let contentHeight,
          (1...100_000).contains(contentHeight)
        else { throw WalletHostCommandError.invalid }
      }
      switch phase {
      case "prepare": try await sheet.prepare(id: id)
      case "present": try await sheet.present(id: id, size: size, contentHeight: contentHeight)
      case "resize":
        guard let contentHeight else { throw WalletHostCommandError.invalid }
        try sheet.resize(id: id, contentHeight: contentHeight)
      case "dismiss": try await sheet.dismiss(id: id)
      case "release": try await sheet.release(id: id)
      default: throw WalletHostCommandError.invalid
      }
      result = WalletHostReply(value: [:])
    case "presentation":
      guard Set(options.keys) == ["version", "blocking"],
        let value = options["blocking"] as? NSNumber,
        CFGetTypeID(value) == CFBooleanGetTypeID()
      else { throw WalletHostCommandError.invalid }
      host.setBlockingPresentation(value.boolValue)
      result = WalletHostReply(value: [:])
    case "openAccount":
      guard Set(options.keys) == ["version"] else { throw WalletHostCommandError.invalid }
      host.openAccount()
      result = WalletHostReply(value: [:])
    case "wallet":
      guard Set(options.keys) == ["version", "request"],
        let request = options["request"] as? [String: Any]
      else { throw WalletHostCommandError.invalid }
      result = try await walletRequest(request, session: session, document: document)
    default: throw WalletHostCommandError.invalid
    }
    guard host.wallet === wallet, session.documentID == document, !session.checkExpiration()
    else { throw WalletHostCommandError.unavailable }
    return result
  }

  private func walletRequest(_ request: [String: Any], session: WalletSession, document: UUID)
    async throws -> WalletHostReply
  {
    guard let method = request["method"] as? String else { throw WalletHostCommandError.invalid }
    let response: String
    switch method {
    case "authorize":
      guard Set(request.keys) == ["method", "publicKey"],
        let encoded = request["publicKey"] as? String, encoded.count <= 684,
        let key = Data(base64Encoded: encoded)
      else { throw AuthError.invalidResponse }
      response = try await session.authorize(publicKey: key)
    case "account":
      guard Set(request.keys).isSubset(of: ["method", "grantID", "principal", "address"]),
        let grant = request["grantID"] as? String, let principal = request["principal"] as? String,
        request["address"] == nil || request["address"] is String
      else { throw AuthError.invalidResponse }
      try session.setAccount(
        grantID: grant, principal: principal, address: request["address"] as? String)
      response = "{}"
    case "readOperations":
      guard Set(request.keys) == ["method"] else { throw AuthError.invalidResponse }
      response = try session.readOperations().json()
    case "writeOperations":
      guard Set(request.keys) == ["method", "revision", "value"],
        let revision = request["revision"] as? String, let value = request["value"] as? String
      else { throw AuthError.invalidResponse }
      response = try session.writeOperations(revision: revision, value: value).json()
    case "signOut", "sessionExpired":
      guard Set(request.keys) == ["method"] else { throw AuthError.invalidResponse }
      return WalletHostReply(
        value: ["response": "{}"],
        afterDelivery: { [weak self] in
          guard let host = self?.host, host.wallet?.session === session,
            session.documentID == document
          else { return }
          if method == "signOut" { host.auth.signOut() } else { host.auth.expire(session.native) }
          host.resume()
        })
    default: throw WalletHostCommandError.invalid
    }
    return WalletHostReply(value: ["response": response])
  }
}

enum WalletRoot: String, CaseIterable { case wallet, activity, search, notes, earn, borrow }

/// Presentation metadata only. The native host never loads a caller-supplied URL.
struct WalletNavigationState {
  let root: WalletRoot
  let requestID: Int
  let revision: Int
  let backURL: URL?

  init?(options: [AnyHashable: Any], origin: URL? = WalletOriginPolicy.baseURL) {
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
        let parent = WalletBackNavigationPolicy.parentURL(path: path, root: root, origin: origin)
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

  init?(options: [AnyHashable: Any], origin: URL? = WalletOriginPolicy.baseURL) {
    guard Set(options.keys) == ["version", "root", "backPath"],
      WalletNavigationState.integer(options["version"]) == 2,
      let value = options["root"] as? String, let root = WalletRoot(rawValue: value),
      let path = options["backPath"] as? String,
      let parentURL = WalletBackNavigationPolicy.parentURL(path: path, root: root, origin: origin)
    else { return nil }
    self.root = root
    self.parentURL = parentURL
  }
}

enum WalletBackNavigationPolicy {
  static func parentURL(path: String, root: WalletRoot, origin: URL? = WalletOriginPolicy.baseURL)
    -> URL?
  {
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
      let origin, let url = URL(string: origin.absoluteString + path),
      WalletOriginPolicy.accepts(url, mainFrame: true, origin: origin)
    else { return nil }
    return url
  }
  static func isToken(_ url: URL?, origin: URL? = WalletOriginPolicy.baseURL) -> Bool {
    guard WalletOriginPolicy.accepts(url, mainFrame: true, origin: origin), let url,
      let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
      components.path == "/transactions/"
    else { return false }
    let items = components.queryItems ?? []
    return ["network", "token"].allSatisfy { name in
      items.contains { $0.name == name && $0.value?.isEmpty == false }
    }
  }
}
