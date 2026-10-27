import Foundation
import Observation

struct BrowserOrigin: Codable, Hashable, Sendable {
  let value: String

  init?(url: URL) {
    guard let parts = URLComponents(url: url, resolvingAgainstBaseURL: false),
      parts.user == nil, parts.password == nil, let host = url.host()?.lowercased(), !host.isEmpty
    else { return nil }
    let scheme = url.scheme?.lowercased()
    var allowed = scheme == "https"
    #if DEBUG
      allowed = allowed || (scheme == "http" && ["localhost", "127.0.0.1", "[::1]"].contains(host))
    #endif
    guard allowed, let scheme else { return nil }
    let defaultPort = scheme == "https" ? 443 : 80
    value = "\(scheme)://\(host)" + (parts.port.map { $0 == defaultPort ? "" : ":\($0)" } ?? "")
  }

  static func website(_ input: String) -> URL? {
    let text = input.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !text.isEmpty, text.count <= 2048, !text.contains(where: \.isWhitespace),
      let url = URL(string: text.contains("://") ? text : "https://" + text),
      BrowserOrigin(url: url) != nil
    else { return nil }
    return url
  }
}

// JSON stays typed across the native router and RPC transport. WebKit receives a JSON string.
enum BrowserJSON: Codable, Equatable, Sendable {
  case string(String)
  case number(Double)
  case bool(Bool)
  case array([BrowserJSON])
  case object([String: BrowserJSON])
  case null
  init(from decoder: any Decoder) throws {
    let container = try decoder.singleValueContainer()
    if container.decodeNil() {
      self = .null
    } else if let value = try? container.decode(Bool.self) {
      self = .bool(value)
    } else if let value = try? container.decode(String.self) {
      self = .string(value)
    } else if let value = try? container.decode(Double.self) {
      self = .number(value)
    } else if let value = try? container.decode([BrowserJSON].self) {
      self = .array(value)
    } else {
      self = .object(try container.decode([String: BrowserJSON].self))
    }
  }
  func encode(to encoder: any Encoder) throws {
    var container = encoder.singleValueContainer()
    switch self {
    case .string(let value): try container.encode(value)
    case .number(let value): try container.encode(value)
    case .bool(let value): try container.encode(value)
    case .array(let value): try container.encode(value)
    case .object(let value): try container.encode(value)
    case .null: try container.encodeNil()
    }
  }
  var array: [BrowserJSON]? { if case .array(let value) = self { value } else { nil } }
  var object: [String: BrowserJSON]? { if case .object(let value) = self { value } else { nil } }
  var string: String? { if case .string(let value) = self { value } else { nil } }
}

struct BrowserRPCError: Error, Codable, Equatable, Sendable {
  let code: Int
  let message: String
  static let rejected = Self(code: 4001, message: "The connection request was declined.")
  static let unauthorized = Self(code: 4100, message: "Open your OISY wallet before connecting.")
  static let unsupported = Self(
    code: 4200, message: "This method is not available in the OISY connection preview.")
  static let chain = Self(code: 4902, message: "Only Sepolia is available in this preview.")
  static let invalid = Self(code: -32602, message: "Invalid request parameters.")
  static let pending = Self(code: -32002, message: "A connection request is already open.")
  static let disconnected = Self(
    code: 4900, message: "This page or wallet session is no longer active.")
  static let internalError = Self(code: -32603, message: "The request could not be completed.")
}

struct BrowserAccount: Equatable {
  let principal: String
  let address: String
  let expiresAt: Date
  var isValid: Bool {
    expiresAt > .now && address.count == 42 && address.hasPrefix("0x")
      && address.dropFirst(2).allSatisfy(\.isHexDigit)
  }
}

@MainActor
final class BrowserGrantStore {
  private let defaults: UserDefaults
  private let key = "oisy.browser.grants.v1"
  init(defaults: UserDefaults = .standard) { self.defaults = defaults }
  func origins(for principal: String) -> Set<String> {
    Set((defaults.dictionary(forKey: key)?[principal] as? [String]) ?? [])
  }
  func clear() { defaults.removeObject(forKey: key) }
  func set(_ origins: Set<String>, for principal: String) {
    var all = defaults.dictionary(forKey: key) ?? [:]
    all[principal] = origins.isEmpty ? nil : origins.sorted()
    defaults.set(all, forKey: key)
  }
}

struct BrowserConnectionRequest: Identifiable {
  let id = UUID()
  let origin: BrowserOrigin
  let account: BrowserAccount
  let document: UUID
}

@MainActor @Observable
final class BrowserProvider {
  static let chainID = "0xaa36a7"
  nonisolated static let readMethods: Set<String> = [
    "eth_blockNumber", "eth_call", "eth_estimateGas", "eth_gasPrice", "eth_maxPriorityFeePerGas",
    "eth_feeHistory", "eth_getBalance", "eth_getBlockByNumber", "eth_getBlockByHash", "eth_getCode",
    "eth_getLogs", "eth_getStorageAt", "eth_getTransactionByHash", "eth_getTransactionCount",
    "eth_getTransactionReceipt", "web3_clientVersion",
  ]
  private(set) var account: BrowserAccount?
  private(set) var origin: BrowserOrigin?
  private(set) var document = UUID()
  private(set) var pending: BrowserConnectionRequest?
  private(set) var grants: Set<String> = []
  @ObservationIgnored private var continuation: CheckedContinuation<BrowserJSON, any Error>?
  @ObservationIgnored private var timeout: Task<Void, Never>?
  @ObservationIgnored private let store: BrowserGrantStore
  @ObservationIgnored private let read: @Sendable (String, BrowserJSON) async throws -> BrowserJSON
  @ObservationIgnored var accountsChanged: (([String]) -> Void)?
  @ObservationIgnored private var activeReads = 0

  init(
    store: BrowserGrantStore = BrowserGrantStore(),
    read: @escaping @Sendable (String, BrowserJSON) async throws -> BrowserJSON = BrowserRPC.read
  ) {
    self.store = store
    self.read = read
  }

  var connected: Bool {
    guard let origin, let account, account.isValid else { return false }
    return grants.contains(origin.value)
  }
  func updateAccount(_ value: BrowserAccount?) {
    guard value != account else { return }
    reject()
    if let old = account, old.principal != value?.principal {
      store.set([], for: old.principal)
    }
    account = value
    grants = value.map { store.origins(for: $0.principal) } ?? []
    accountsChanged?([])
  }
  func navigate(to value: BrowserOrigin?) {
    reject()
    document = UUID()
    origin = value
  }
  func revokeAll() {
    reject()
    store.clear()
    grants = []
    accountsChanged?([])
  }
  func revoke() {
    guard let origin else { return }
    revoke(origin: origin.value)
  }
  func revoke(origin value: String) {
    guard let account, grants.remove(value) != nil else { return }
    store.set(grants, for: account.principal)
    if pending?.origin.value == value { reject() }
    if origin?.value == value { accountsChanged?([]) }
  }
  func approve() {
    guard let request = pending, request.document == document, request.origin == origin,
      request.account == account, request.account.isValid
    else {
      reject(error: .disconnected)
      return
    }
    grants.insert(request.origin.value)
    store.set(grants, for: request.account.principal)
    complete(.success(.array([.string(request.account.address)])))
    accountsChanged?([request.account.address])
  }
  func reject(error: BrowserRPCError = .rejected) { complete(.failure(error)) }
  private func complete(_ result: Result<BrowserJSON, any Error>) {
    let callback = continuation
    continuation = nil
    pending = nil
    timeout?.cancel()
    timeout = nil
    callback?.resume(with: result)
  }
  private var accounts: BrowserJSON {
    .array(connected ? account.map { [.string($0.address)] } ?? [] : [])
  }
  private var permissions: BrowserJSON {
    guard connected, let origin else { return .array([]) }
    return .array([
      .object([
        "parentCapability": .string("eth_accounts"), "invoker": .string(origin.value),
        "caveats": .array([
          .object(["type": .string("restrictReturnedAccounts"), "value": accounts])
        ]),
      ])
    ])
  }
  func request(
    method: String, params: BrowserJSON = .array([]),
    origin: BrowserOrigin, document: UUID
  ) async throws -> BrowserJSON {
    guard origin == self.origin, document == self.document else {
      throw BrowserRPCError.disconnected
    }
    guard params.array != nil || params.object != nil else { throw BrowserRPCError.invalid }
    switch method {
    case "eth_chainId": return .string(Self.chainID)
    case "net_version": return .string("11155111")
    case "eth_accounts": return accounts
    case "wallet_getPermissions": return permissions
    case "wallet_revokePermissions":
      guard params.array?.count == 1, params.array?.first?.object?.keys.sorted() == ["eth_accounts"]
      else { throw BrowserRPCError.invalid }
      revoke()
      return .null
    case "wallet_switchEthereumChain":
      guard params.array?.count == 1, let chain = params.array?.first?.object?["chainId"]?.string
      else { throw BrowserRPCError.invalid }
      guard chain.lowercased() == Self.chainID else { throw BrowserRPCError.chain }
      return .null
    case "eth_requestAccounts", "wallet_requestPermissions":
      if method == "wallet_requestPermissions" {
        guard params.array?.count == 1,
          params.array?.first?.object?.keys.sorted() == ["eth_accounts"],
          params.array?.first?.object?["eth_accounts"]?.object != nil
        else { throw BrowserRPCError.invalid }
      }
      if connected { return method == "eth_requestAccounts" ? accounts : permissions }
      guard let account, account.isValid else { throw BrowserRPCError.unauthorized }
      guard pending == nil else { throw BrowserRPCError.pending }
      let request = BrowserConnectionRequest(origin: origin, account: account, document: document)
      _ =
        try await withCheckedThrowingContinuation { continuation in
          self.continuation = continuation
          pending = request
          timeout = Task { [weak self] in
            do { try await Task.sleep(for: .seconds(60)) } catch { return }
            guard self?.pending?.id == request.id else { return }
            self?.reject()
          }
        } as BrowserJSON
      guard self.document == document, self.account == account, account.isValid else {
        throw BrowserRPCError.disconnected
      }
      return method == "eth_requestAccounts" ? accounts : permissions
    default:
      guard Self.readMethods.contains(method) else { throw BrowserRPCError.unsupported }
      guard params.array != nil else { throw BrowserRPCError.invalid }
      guard activeReads < 8 else { throw BrowserRPCError.pending }
      activeReads += 1
      defer { activeReads -= 1 }
      let value = try await read(method, params)
      guard document == self.document, origin == self.origin else {
        throw BrowserRPCError.disconnected
      }
      return value
    }
  }
}

enum BrowserRPC {
  static func read(method: String, params: BrowserJSON) async throws -> BrowserJSON {
    guard BrowserProvider.readMethods.contains(method),
      let url = URL(string: "https://ethereum-sepolia-rpc.publicnode.com")
    else {
      throw BrowserRPCError.unsupported
    }
    var request = URLRequest(url: url, timeoutInterval: 20)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONEncoder().encode(
      BrowserJSON.object([
        "jsonrpc": .string("2.0"), "id": .number(1), "method": .string(method), "params": params,
      ]))
    let (data, response) = try await URLSession.shared.data(for: request)
    guard let response = response as? HTTPURLResponse, (200...299).contains(response.statusCode),
      data.count <= 2_097_152,
      let body = try JSONDecoder().decode(BrowserJSON.self, from: data).object,
      body["jsonrpc"] == .string("2.0"), body["id"] == .number(1)
    else {
      throw BrowserRPCError.internalError
    }
    if let error = body["error"], let encoded = try? JSONEncoder().encode(error),
      let failure = try? JSONDecoder().decode(BrowserRPCError.self, from: encoded)
    {
      throw failure
    }
    guard let result = body["result"] else { throw BrowserRPCError.internalError }
    return result
  }
}
