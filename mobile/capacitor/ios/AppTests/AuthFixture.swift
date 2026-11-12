import CryptoKit
import Foundation
import IcpSdkCore

@testable import App

@MainActor
final class TestAuthStore: AuthenticationBackend {
  let service: String
  var value: AuthSession?
  var failure: Error?
  var preservesValueOnSignOut = false
  private(set) var restoreCalls = 0
  private(set) var signInCalls = 0
  private(set) var signOutCalls = 0
  var pendingSignIn: (() async throws -> AuthSession)?
  var pendingRestore: (() async throws -> AuthSession?)?
  init(service: String = UUID().uuidString) { self.service = service }
  func save(_ session: AuthSession) throws { value = session }
  func clear() throws { value = nil }
  func restore() async throws -> AuthSession? {
    restoreCalls += 1
    if let failure { throw failure }
    if let pendingRestore { return try await pendingRestore() }
    return value
  }
  func signIn() async throws -> AuthSession {
    signInCalls += 1
    if let pendingSignIn { return try await pendingSignIn() }
    if let failure { throw failure }
    guard let value else { throw App.AuthError.signIn }
    return value
  }
  func signOut() async throws {
    signOutCalls += 1
    if let failure { throw failure }
    if !preservesValueOnSignOut { value = nil }
  }
}

extension AuthModel {
  convenience init(store: TestAuthStore, preferences: UserDefaults = .standard) {
    self.init(
      backend: store, preferences: preferences,
      preferenceKey: store.service + ".hasSignedIn", initialSession: store.value,
      removeLegacy: {})
  }
}

@MainActor
func fixtureSession(
  key: Curve25519.Signing.PrivateKey, expiry: Date,
  root: Curve25519.Signing.PrivateKey = .init()
) throws -> AuthSession {
  let rootDER = fixturePublicKey(root)
  let nativeDER = fixturePublicKey(key)
  let deadline = UInt64(expiry.timeIntervalSince1970 * 1000)
  let ii = try principalFromText(text: "rdmx6-jaaaa-aaaaa-aaadq-cai")
  let principal = try principalToText(bytes: principalSelfAuthenticating(publicKeyDer: rootDER))
  return AuthSession(
    id: UUID(), principal: principal,
    expiresAt: Date(timeIntervalSince1970: Double(deadline) / 1000)
  ) { publicKey in
    let parent = IcpSdkCore.Delegation(
      pubkey: nativeDER, expirationNs: deadline * 1_000_000,
      targets: [ii], permissions: nil)
    let child = IcpSdkCore.Delegation(
      pubkey: publicKey, expirationNs: deadline * 1_000_000,
      targets: [ii], permissions: nil)
    let chain = IcpSdkCore.DelegationChain(
      publicKey: rootDER,
      delegations: [
        SignedDelegation(
          delegation: parent,
          signature: try root.signature(for: delegationSignable(delegation: parent))),
        SignedDelegation(
          delegation: child,
          signature: try key.signature(for: delegationSignable(delegation: child))),
      ])
    return WebDelegation(
      id: UUID().uuidString, principal: principal, expiresAt: Double(deadline),
      chain: DelegationJSON(chain))
  }
}
func fixturePublicKey(_ key: Curve25519.Signing.PrivateKey) -> Data {
  Data([0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00])
    + key.publicKey.rawRepresentation
}
