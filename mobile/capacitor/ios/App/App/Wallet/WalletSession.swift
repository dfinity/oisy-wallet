import Foundation

/// A bounded delegation for the one bundled wallet. No native balance pipeline.
@MainActor
final class WalletSession {
  let native: AuthSession
  private(set) var grant: WebDelegation?
  private(set) var isActive = true
  private var timer: Task<Void, Never>?
  private let onExpired: (AuthSession) -> Void
  private let onAccount: (BrowserAccount?) -> Void
  private let operationStore: OperationJournalStore

  init(
    native: AuthSession, onExpired: @escaping (AuthSession) -> Void,
    onAccount: @escaping (BrowserAccount?) -> Void,
    operationStore: OperationJournalStore = .init()
  ) {
    self.native = native
    self.onExpired = onExpired
    self.onAccount = onAccount
    self.operationStore = operationStore
    schedule()
  }
  @discardableResult func checkExpiration(now: Date = .now) -> Bool {
    guard isActive else { return true }
    let deadline = min(
      native.expiresAt,
      grant.map { Date(timeIntervalSince1970: $0.expiresAt / 1000) } ?? native.expiresAt)
    guard deadline <= now else { return false }
    close()
    onExpired(native)
    return true
  }
  func authorize(publicKey: Data) throws -> String {
    guard !checkExpiration() else { throw AuthError.expired }
    let issued = try WebDelegation(session: native, publicKey: publicKey)
    grant = issued
    onAccount(nil)
    schedule()
    return String(decoding: try JSONEncoder().encode(issued), as: UTF8.self)
  }
  func setAccount(grantID: String, principal: String, address: String?) throws {
    guard !checkExpiration() else { throw AuthError.expired }
    guard let grant, grant.id == grantID, grant.principal == principal else {
      throw AuthError.invalidResponse
    }
    if let address {
      let account = BrowserAccount(
        principal: principal, address: address,
        expiresAt: Date(timeIntervalSince1970: grant.expiresAt / 1000))
      guard account.isValid else { throw AuthError.invalidResponse }
      onAccount(account)
    } else {
      onAccount(nil)
    }
  }
  // The web caller cannot supply an owner. A new document must authorize its
  // own child key before it can read metadata left by a previous session.
  private func operationPrincipal() throws -> String {
    guard !checkExpiration(), let grant, grant.principal == native.principal else {
      throw AuthError.expired
    }
    return grant.principal
  }
  func readOperations() throws -> OperationJournalSnapshot {
    try operationStore.read(principal: operationPrincipal())
  }
  func writeOperations(revision: String, value: String) throws -> OperationJournalSnapshot {
    try operationStore.write(principal: operationPrincipal(), revision: revision, value: value)
  }

  func resetDocument() {
    guard !checkExpiration() else { return }
    grant = nil
    onAccount(nil)
    schedule()
  }
  func close() {
    timer?.cancel()
    timer = nil
    grant = nil
    isActive = false
    onAccount(nil)
  }
  private func schedule() {
    timer?.cancel()
    let deadline = min(
      native.expiresAt,
      grant.map { Date(timeIntervalSince1970: $0.expiresAt / 1000) } ?? native.expiresAt)
    timer = Task { [weak self] in
      do { try await Task.sleep(for: .seconds(max(0, deadline.timeIntervalSinceNow))) } catch {
        return
      }
      guard let self, !checkExpiration() else { return }
      schedule()
    }
  }
}
