import Foundation
import IcpSdkAuth
import IcpSdkCore

@MainActor
protocol AuthenticationBackend {
  func restore() async throws -> AuthSession?
  func signIn() async throws -> AuthSession
  func signOut() async throws
}

/// Uses the reviewed SDK revision and local-hop patch, with isolated platform storage.
@MainActor
final class SDKAuthentication: AuthenticationBackend {
  private let client: IcpSdkAuth.AuthClient
  private var snapshot: AuthSession?

  init() throws {
    let environment = try AppEnvironment.load()
    guard environment.legacyKeychainService == LegacyCredentialStore.legacyService else {
      throw AuthError.storage
    }
    let directory = try FileManager.default.url(
      for: .applicationSupportDirectory,
      in: .userDomainMask, appropriateFor: nil, create: true
    )
    .appendingPathComponent(environment.sdkStorageDirectory, isDirectory: true)
    #if targetEnvironment(simulator)
      let keyStorage = KeychainIdentity.Storage.software
    #else
      let keyStorage = KeychainIdentity.Storage.secureEnclave
    #endif
    client = try IcpSdkAuth.AuthClient(
      callbackUrl: environment.authCallbackURL,
      credentials: AppleCredentialStorage(
        configuration: .init(
          storage: keyStorage, keyTagPrefix: environment.sdkKeyTagPrefix,
          directory: directory.appendingPathComponent("credentials", isDirectory: true))),
      state: AppleStateStorage(
        configuration: .init(
          directory: directory.appendingPathComponent("state", isDirectory: true),
          derivationOrigin: environment.derivationOrigin)),
      provider: IdentityProvider(
        authorizeUrl: environment.internetIdentityAuthorizeURL,
        canisterId: environment.internetIdentityCanisterID),
      endpoint: environment.internetComputerHost,
      derivationOrigin: environment.derivationOrigin)
  }

  func restore() async throws -> AuthSession? {
    try await client.restore()
    return try current()
  }

  func signIn() async throws -> AuthSession {
    _ = try await client.signIn(maxTimeToLiveNs: UInt64(AuthSession.duration) * 1_000_000_000)
    guard let session = try current() else { throw AuthError.expired }
    return session
  }

  func signOut() async throws {
    snapshot = nil
    try await client.signOut()
  }

  private func current() throws -> AuthSession? {
    switch client.status() {
    case .signedOut:
      snapshot = nil
      return nil
    case .expired:
      snapshot = nil
      throw AuthError.expired
    case .signedIn(let account, let expiry):
      let principal = try principalToText(bytes: account)
      // Keep the exact original deadline, rounded down to JS millisecond precision.
      let milliseconds = expiry / 1_000_000
      let deadline = Date(timeIntervalSince1970: Double(milliseconds) / 1000)
      guard deadline > .now else { throw AuthError.expired }
      if let snapshot, snapshot.principal == principal, snapshot.expiresAt == deadline {
        return snapshot
      }
      let client = client
      let session = AuthSession(id: UUID(), principal: principal, expiresAt: deadline) { key in
        guard case .signedIn(let currentAccount, let currentExpiry) = client.status(),
          currentAccount == account, currentExpiry == expiry, deadline > .now
        else { throw AuthError.expired }
        let chain = try await client.delegateSession(to: key, expiresAtNs: milliseconds * 1_000_000)
        guard case .signedIn(let currentAccount, let currentExpiry) = client.status(),
          currentAccount == account, currentExpiry == expiry, deadline > .now
        else { throw AuthError.expired }
        return WebDelegation(
          id: UUID().uuidString, principal: principal,
          expiresAt: Double(milliseconds), chain: DelegationJSON(chain))
      }
      snapshot = session
      return session
    }
  }
}
