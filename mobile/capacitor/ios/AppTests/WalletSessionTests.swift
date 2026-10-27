import CryptoKit
import XCTest

@testable import App

@MainActor
final class WalletSessionTests: XCTestCase {
  func testBoundedChildKeepsPrincipalAndCannotRestoreAfterExpiry() throws {
    let native = try fixtureSession(
      key: Curve25519.Signing.PrivateKey(), expiry: .now.addingTimeInterval(3600))
    var expired: AuthSession?
    var account: BrowserAccount?
    let session = WalletSession(
      native: native, onExpired: { expired = $0 }, onAccount: { account = $0 })
    let child = Curve25519.Signing.PrivateKey()
    _ = try session.authorize(publicKey: Icrc167.derPublicKey(child))
    let grant = try XCTUnwrap(session.grant)
    XCTAssertEqual(grant.principal, native.principal)
    try AuthSession(privateKey: child.rawRepresentation, chain: grant.chain).validate()
    XCTAssertLessThanOrEqual(
      grant.expiresAt, Date.now.addingTimeInterval(300).timeIntervalSince1970 * 1000)
    try session.setAccount(
      grantID: grant.id, principal: grant.principal,
      address: "0x2222222222222222222222222222222222222222")
    XCTAssertNotNil(account)
    XCTAssertFalse(session.checkExpiration())
    XCTAssertNil(expired)
    XCTAssertTrue(session.checkExpiration(now: Date(timeIntervalSince1970: grant.expiresAt / 1000)))
    XCTAssertEqual(expired, native)
    XCTAssertNil(account)
    XCTAssertThrowsError(try session.authorize(publicKey: Icrc167.derPublicKey(child)))
    XCTAssertThrowsError(
      try session.setAccount(grantID: grant.id, principal: grant.principal, address: nil))
  }
  func testDocumentChangeRejectsStaleAccountAndInvalidKeys() throws {
    let native = try fixtureSession(
      key: Curve25519.Signing.PrivateKey(), expiry: .now.addingTimeInterval(600))
    let session = WalletSession(
      native: native, onExpired: { _ in XCTFail("Not expired") }, onAccount: { _ in })
    defer { session.close() }
    XCTAssertThrowsError(try session.authorize(publicKey: Data()))
    XCTAssertThrowsError(try session.authorize(publicKey: native.chain.publicKey))
    XCTAssertThrowsError(
      try session.authorize(
        publicKey: XCTUnwrap(native.chain.signerDelegation.last?.delegation.pubkey)))
    _ = try session.authorize(publicKey: Icrc167.derPublicKey(Curve25519.Signing.PrivateKey()))
    let grant = try XCTUnwrap(session.grant)
    session.resetDocument()
    XCTAssertThrowsError(
      try session.setAccount(grantID: grant.id, principal: grant.principal, address: nil))
  }
  func testParentTimerExpiresWithoutAWebResponse() async throws {
    let native = try fixtureSession(
      key: Curve25519.Signing.PrivateKey(), expiry: .now.addingTimeInterval(1))
    let ended = expectation(description: "expired")
    let session = WalletSession(
      native: native, onExpired: { _ in ended.fulfill() }, onAccount: { _ in })
    await fulfillment(of: [ended], timeout: 4)
    XCTAssertFalse(session.isActive)
  }
}
