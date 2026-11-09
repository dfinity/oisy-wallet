import CryptoKit
import XCTest

@testable import App

@MainActor final class WalletSessionTests: XCTestCase {
  func testGrantLifetimeAccountBindingAndDocumentReplacement() async throws {
    let native = try fixtureSession(key: .init(), expiry: .now.addingTimeInterval(3600))
    var expired: AuthSession?
    var account: BrowserAccount?
    let session = WalletSession(
      native: native, onExpired: { expired = $0 }, onAccount: { account = $0 })
    _ = try await session.authorize(
      publicKey: P256.Signing.PrivateKey().publicKey.derRepresentation)
    let grant = try XCTUnwrap(session.grant)
    XCTAssertEqual(grant.principal, native.principal)
    XCTAssertEqual(grant.expiresAt, native.expiresAt.timeIntervalSince1970 * 1000, accuracy: 1)
    try session.setAccount(
      grantID: grant.id, principal: grant.principal,
      address: "0x2222222222222222222222222222222222222222")
    XCTAssertNotNil(account)
    session.resetDocument()
    XCTAssertNil(account)
    XCTAssertThrowsError(
      try session.setAccount(grantID: grant.id, principal: grant.principal, address: nil))
    _ = try await session.authorize(
      publicKey: P256.Signing.PrivateKey().publicKey.derRepresentation)
    XCTAssertTrue(session.checkExpiration(now: native.expiresAt))
    XCTAssertEqual(expired, native)
    do {
      _ = try await session.authorize(publicKey: Data([1]))
      XCTFail("Expired session accepted a key")
    } catch {}
  }
  func testLateGrantCannotAttachToReplacementDocument() async throws {
    let fixture = try fixtureSession(key: .init(), expiry: .now.addingTimeInterval(600))
    var answer: CheckedContinuation<WebDelegation, Error>?
    let native = AuthSession(
      id: fixture.id, principal: fixture.principal, expiresAt: fixture.expiresAt
    ) { _ in
      try await withCheckedThrowingContinuation { answer = $0 }
    }
    let session = WalletSession(native: native, onExpired: { _ in }, onAccount: { _ in })
    let key = P256.Signing.PrivateKey().publicKey.derRepresentation
    let task = Task { try await session.authorize(publicKey: key) }
    for _ in 0..<10 where answer == nil { await Task.yield() }
    session.resetDocument()
    answer?.resume(returning: try await fixture.delegate(key))
    do {
      _ = try await task.value
      XCTFail("Stale grant accepted")
    } catch {}
    XCTAssertNil(session.grant)
  }
  func testRepeatedAuthorizationIsSingleUseUntilDocumentReplacement() async throws {
    let native = try fixtureSession(key: .init(), expiry: .now.addingTimeInterval(600))
    let session = WalletSession(native: native, onExpired: { _ in }, onAccount: { _ in })
    let key = P256.Signing.PrivateKey().publicKey.derRepresentation
    _ = try await session.authorize(publicKey: key)
    do {
      _ = try await session.authorize(publicKey: key)
      XCTFail("Repeated grant accepted")
    } catch {}
    session.close()
    XCTAssertNil(session.grant)
    XCTAssertTrue(session.checkExpiration())
  }
}
