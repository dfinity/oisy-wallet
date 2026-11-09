import CryptoKit
import Security
import XCTest

@testable import App

@MainActor
final class OperationJournalTests: XCTestCase {
  private func record(kind: String = "evmSend", id: String = UUID().uuidString) -> [String: Any] {
    ["kind": kind, "id": id, "createdAt": 1_800_000_000_000]
  }

  private func encode(_ records: [[String: Any]]) throws -> String {
    String(decoding: try JSONSerialization.data(withJSONObject: records), as: UTF8.self)
  }

  private func clear(_ store: OperationJournalStore) {
    let query: [String: CFTypeRef] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: store.service as CFString,
    ]
    XCTAssertEqual(SecItemDelete(query as CFDictionary), errSecSuccess)
  }

  private func session(
    native: AuthSession, store: OperationJournalStore
  ) -> WalletSession {
    WalletSession(
      native: native, onExpired: { _ in }, onAccount: { _ in }, operationStore: store)
  }

  private func authorize(_ session: WalletSession) async throws {
    _ = try await session.authorize(
      publicKey: P256.Signing.PrivateKey().publicKey.derRepresentation)
  }

  func testOnlyBoundedJournalEnvelopesAreAccepted() throws {
    let valid = try encode([record(), record(kind: "icpSwap")])
    XCTAssertNoThrow(try OperationJournalStore.validate(valid))
    XCTAssertNoThrow(try OperationJournalStore.validate("[]"))
    let duplicate = record()
    for invalid in ["{}", "null", "[1]", "not json", try encode([duplicate, duplicate])] {
      XCTAssertThrowsError(try OperationJournalStore.validate(invalid))
    }
    for field in ["kind", "id", "createdAt"] {
      var missing = record()
      missing.removeValue(forKey: field)
      XCTAssertThrowsError(try OperationJournalStore.validate(encode([missing])))
    }
    for kind in ["secret", "sign", "fetch", "EvmSend", ""] {
      XCTAssertThrowsError(try OperationJournalStore.validate(encode([record(kind: kind)])))
    }
    XCTAssertThrowsError(try OperationJournalStore.validate(encode([record(id: "not-uuid")])))
    for timestamp: Any in [true, -1, 1.5, 9_007_199_254_740_992, "1800000000000", NSNull()] {
      var invalid = record()
      invalid["createdAt"] = timestamp
      XCTAssertThrowsError(try OperationJournalStore.validate(encode([invalid])))
    }
    let sixteen = (0..<16).map { _ in record() }
    XCTAssertNoThrow(try OperationJournalStore.validate(encode(sixteen)))
    XCTAssertThrowsError(try OperationJournalStore.validate(encode(sixteen + [record()])))
    var unicode = record()
    // Fewer than 16K characters can still exceed the UTF-8 byte budget.
    unicode["detail"] = String(repeating: "🙂", count: 4_096)
    let oversized = try encode([unicode])
    XCTAssertLessThan(oversized.count, OperationJournalStore.maximumBytes)
    XCTAssertThrowsError(try OperationJournalStore.validate(oversized))
  }

  func testCompareAndSwapSurvivesRecreationAndDoesNotLoseConcurrentUpdates() throws {
    let store = OperationJournalStore(service: "oisy.operation.tests.\(UUID())")
    XCTAssertEqual(try store.read(principal: "wallet-a"), .empty)
    let value = try encode([record()])
    let first = try store.write(principal: "wallet-a", revision: "", value: value)
    defer { clear(store) }
    XCTAssertNotNil(UUID(uuidString: first.revision))
    XCTAssertEqual(first.value, value)
    XCTAssertEqual(
      try JSONDecoder().decode(OperationJournalSnapshot.self, from: Data(first.json().utf8)), first)
    let restored = OperationJournalStore(service: store.service)
    XCTAssertEqual(try restored.read(principal: "wallet-a"), first)
    XCTAssertThrowsError(try restored.write(principal: "wallet-a", revision: "", value: "[]")) {
      guard case OperationJournalError.conflict = $0 else {
        return XCTFail("Expected a stale-revision conflict")
      }
    }
    XCTAssertEqual(try store.read(principal: "wallet-a"), first)
    let second = try restored.write(principal: "wallet-a", revision: first.revision, value: "[]")
    XCTAssertNotEqual(second.revision, first.revision)
    XCTAssertEqual(second.value, "[]")
    XCTAssertThrowsError(
      try store.write(principal: "wallet-a", revision: first.revision, value: value))
    XCTAssertEqual(try store.read(principal: "wallet-a"), second)
    XCTAssertThrowsError(try store.write(principal: "wallet-a", revision: "broken", value: value))
    XCTAssertThrowsError(
      try store.write(principal: "wallet-a", revision: second.revision, value: "{}"))
    XCTAssertEqual(try store.read(principal: "wallet-a"), second)
  }

  func testAuthenticatedWalletIsolationAcrossLogoutExpiryAndDocumentReplacement() async throws {
    let store = OperationJournalStore(service: "oisy.operation.tests.\(UUID())")
    let firstNative = try fixtureSession(
      key: Curve25519.Signing.PrivateKey(), expiry: .now.addingTimeInterval(600))
    let firstSession = session(native: firstNative, store: store)
    defer { firstSession.close() }
    XCTAssertThrowsError(try firstSession.readOperations())
    XCTAssertThrowsError(try firstSession.writeOperations(revision: "", value: "[]"))
    try await authorize(firstSession)
    let saved = try firstSession.writeOperations(revision: "", value: encode([record()]))
    defer { clear(store) }
    firstSession.resetDocument()
    XCTAssertThrowsError(try firstSession.readOperations())
    XCTAssertThrowsError(try firstSession.writeOperations(revision: saved.revision, value: "[]"))
    try await authorize(firstSession)
    XCTAssertEqual(try firstSession.readOperations(), saved)
    firstSession.close()
    XCTAssertThrowsError(try firstSession.readOperations())
    XCTAssertThrowsError(try firstSession.writeOperations(revision: saved.revision, value: "[]"))

    let otherNative = try fixtureSession(
      key: Curve25519.Signing.PrivateKey(), expiry: .now.addingTimeInterval(600))
    let otherSession = session(native: otherNative, store: store)
    defer { otherSession.close() }
    XCTAssertNotEqual(otherNative.principal, firstNative.principal)
    try await authorize(otherSession)
    XCTAssertEqual(try otherSession.readOperations(), .empty)
    let otherSaved = try otherSession.writeOperations(
      revision: "", value: encode([record(kind: "icpSwap")]))

    let restored = session(native: firstNative, store: .init(service: store.service))
    defer { restored.close() }
    try await authorize(restored)
    XCTAssertEqual(try restored.readOperations(), saved)
    XCTAssertTrue(restored.checkExpiration(now: firstNative.expiresAt))
    XCTAssertThrowsError(try restored.readOperations())
    XCTAssertThrowsError(try restored.writeOperations(revision: saved.revision, value: "[]"))
    XCTAssertEqual(try otherSession.readOperations(), otherSaved)
    let afterExpiry = session(native: firstNative, store: .init(service: store.service))
    defer { afterExpiry.close() }
    try await authorize(afterExpiry)
    XCTAssertEqual(try afterExpiry.readOperations(), saved)
  }

  func testKeychainItemIsDeviceOnlyNonSynchronizingAndDoesNotExposePrincipalAsAccount() throws {
    let store = OperationJournalStore(service: "oisy.operation.tests.\(UUID())")
    let principal = "wallet-principal"
    _ = try store.write(principal: principal, revision: "", value: encode([record()]))
    defer { clear(store) }
    let query: [String: CFTypeRef] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: store.service as CFString,
      kSecReturnAttributes as String: kCFBooleanTrue,
      kSecMatchLimit as String: kSecMatchLimitOne,
    ]
    var item: CFTypeRef?
    XCTAssertEqual(SecItemCopyMatching(query as CFDictionary, &item), errSecSuccess)
    let attributes = try XCTUnwrap(item as? [String: Any])
    XCTAssertEqual(
      attributes[kSecAttrAccessible as String] as? String,
      kSecAttrAccessibleWhenUnlockedThisDeviceOnly as String)
    XCTAssertNotEqual(attributes[kSecAttrAccount as String] as? String, principal)
    XCTAssertEqual((attributes[kSecAttrAccount as String] as? String)?.count, 64)
    XCTAssertNotEqual(attributes[kSecAttrSynchronizable as String] as? Bool, true)
  }
}
