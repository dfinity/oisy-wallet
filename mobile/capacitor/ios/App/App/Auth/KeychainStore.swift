import Foundation
import Security

struct KeychainFailure: Error { let status: OSStatus }

struct KeychainStore {
  var service = "com.oisy.native.mvp.audit-session"

  private var query: [String: CFTypeRef] {
    [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service as CFString,
      kSecAttrAccount as String: "internet-identity" as CFString,
    ]
  }

  func load() throws -> AuthSession? {
    var request = query
    request[kSecReturnData as String] = kCFBooleanTrue
    request[kSecMatchLimit as String] = kSecMatchLimitOne
    var item: CFTypeRef?
    let status = SecItemCopyMatching(request as CFDictionary, &item)
    if status == errSecItemNotFound { return nil }
    guard status == errSecSuccess, let data = item as? Data else {
      throw KeychainFailure(status: status)
    }
    do { return try JSONDecoder().decode(AuthSession.self, from: data) } catch {
      throw AuthError.invalidResponse
    }
  }

  func save(_ session: AuthSession) throws {
    try session.validate()
    let data = try JSONEncoder().encode(session)
    let attributes: [String: CFTypeRef] = [
      kSecValueData as String: data as CFData,
      kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
    ]
    let status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
    if status == errSecItemNotFound {
      let item = query.merging(attributes) { _, new in new }
      let added = SecItemAdd(item as CFDictionary, nil)
      guard added == errSecSuccess else { throw KeychainFailure(status: added) }
    } else if status != errSecSuccess {
      throw KeychainFailure(status: status)
    }
  }

  func clear() throws {
    let status = SecItemDelete(query as CFDictionary)
    guard status == errSecSuccess || status == errSecItemNotFound else {
      throw KeychainFailure(status: status)
    }
  }
}
