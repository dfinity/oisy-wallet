import Foundation
import Security

struct KeychainFailure: Error { let status: OSStatus }

/// Migration cleanup only. New credentials belong to the SDK's Apple stores.
struct LegacyCredentialStore {
  static let legacyService = "com.oisy.native.mvp.audit-session"
  func clear() throws {
    let status = SecItemDelete(
      [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrService as String: Self.legacyService,
        kSecAttrAccount as String: "internet-identity",
      ] as CFDictionary)
    guard status == errSecSuccess || status == errSecItemNotFound else {
      throw KeychainFailure(status: status)
    }
  }
}
