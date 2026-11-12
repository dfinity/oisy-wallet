import CryptoKit
import Foundation
import Security

/// Metadata only. Transaction interpretation and recovery belong to the shared web services.
struct OperationJournalSnapshot: Codable, Equatable {
  let revision: String
  let value: String

  static let empty = Self(revision: "", value: "[]")

  func json() throws -> String {
    String(decoding: try JSONEncoder().encode(self), as: UTF8.self)
  }
}

enum OperationJournalError: Error { case invalidData, conflict }

/// Main-actor serialization makes the revision comparison and Keychain update one operation.
/// The caller must derive `principal` from the current authorized wallet grant.
@MainActor
struct OperationJournalStore {
  var service = "com.oisy.native.mvp.operations"
  static let maximumBytes = 16_384
  static let maximumRecords = 16

  private func query(principal: String) -> [String: CFTypeRef] {
    let account = SHA256.hash(data: Data(principal.utf8)).map { String(format: "%02x", $0) }
      .joined()
    return [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service as CFString,
      kSecAttrAccount as String: account as CFString,
      kSecAttrSynchronizable as String: kCFBooleanFalse,
    ]
  }

  func read(principal: String) throws -> OperationJournalSnapshot {
    guard !principal.isEmpty, principal.utf8.count <= 100 else {
      throw OperationJournalError.invalidData
    }
    var request = query(principal: principal)
    request[kSecReturnData as String] = kCFBooleanTrue
    request[kSecMatchLimit as String] = kSecMatchLimitOne
    var item: CFTypeRef?
    let status = SecItemCopyMatching(request as CFDictionary, &item)
    if status == errSecItemNotFound { return .empty }
    guard status == errSecSuccess, let data = item as? Data else {
      throw KeychainFailure(status: status)
    }
    // JSON escaping can enlarge the stored envelope; retain a bound before decoding it.
    guard data.count <= Self.maximumBytes * 6 + 256 else {
      throw OperationJournalError.invalidData
    }
    let snapshot = try JSONDecoder().decode(OperationJournalSnapshot.self, from: data)
    guard UUID(uuidString: snapshot.revision) != nil else {
      throw OperationJournalError.invalidData
    }
    try Self.validate(snapshot.value)
    return snapshot
  }

  func write(principal: String, revision: String, value: String) throws -> OperationJournalSnapshot
  {
    guard revision.isEmpty || UUID(uuidString: revision) != nil else {
      throw OperationJournalError.invalidData
    }
    try Self.validate(value)
    let current = try read(principal: principal)
    guard current.revision == revision else { throw OperationJournalError.conflict }
    let next = OperationJournalSnapshot(revision: UUID().uuidString, value: value)
    let data = try JSONEncoder().encode(next)
    let attributes: [String: CFTypeRef] = [
      kSecValueData as String: data as CFData,
      kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
    ]
    let query = query(principal: principal)
    let status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
    if status == errSecItemNotFound {
      let item = query.merging(attributes) { _, new in new }
      let added = SecItemAdd(item as CFDictionary, nil)
      guard added == errSecSuccess else { throw KeychainFailure(status: added) }
    } else if status != errSecSuccess {
      throw KeychainFailure(status: status)
    }
    return next
  }

  static func validate(_ value: String) throws {
    let data = Data(value.utf8)
    guard data.count <= maximumBytes,
      let records = try JSONSerialization.jsonObject(with: data) as? [[String: Any]],
      records.count <= maximumRecords
    else { throw OperationJournalError.invalidData }
    var ids = Set<UUID>()
    for record in records {
      guard let kind = record["kind"] as? String, ["evmSend", "icpSwap"].contains(kind),
        let rawID = record["id"] as? String, let id = UUID(uuidString: rawID),
        ids.insert(id).inserted,
        WalletNavigationState.integer(record["createdAt"]) != nil
      else { throw OperationJournalError.invalidData }
    }
  }
}
