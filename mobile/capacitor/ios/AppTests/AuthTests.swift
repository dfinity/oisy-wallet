import CryptoKit
import XCTest

@testable import App

final class AuthTests: XCTestCase {
  private let now = Date(timeIntervalSince1970: 1_800_000_000)

  private func chain(
    _ request: Icrc167, expiration: String = "1800003600000000000",
    pubkey: Data? = nil, targets: [String]? = nil
  ) -> DelegationChain {
    DelegationChain(
      publicKey: Data([0x30, 0x01, 0x02]),
      signerDelegation: [
        .init(
          delegation: .init(
            pubkey: pubkey ?? Icrc167.derPublicKey(request.key),
            expiration: expiration, targets: targets), signature: Data([1, 2, 3]))
      ])
  }

  private func callback(
    _ request: Icrc167, chain: DelegationChain, state: String? = nil,
    id: Int = 1, batch: Bool = false
  ) throws -> URL {
    struct Response: Encodable {
      let jsonrpc = "2.0"
      let id: Int
      let result: DelegationChain
    }
    let response = Response(id: id, result: chain)
    let data = try batch ? JSONEncoder().encode([response]) : JSONEncoder().encode(response)
    var query = URLComponents()
    query.queryItems = [
      URLQueryItem(name: "state", value: state ?? request.state),
      URLQueryItem(name: "message", value: String(decoding: data, as: UTF8.self)),
    ]
    var url = try XCTUnwrap(URLComponents(string: "oisy://auth-callback"))
    url.percentEncodedFragment = query.percentEncodedQuery?.replacingOccurrences(
      of: "+", with: "%2B")
    return try XCTUnwrap(url.url)
  }

  func testRequestUsesAuditOriginFreshKeysStateAnd24HourTTL() throws {
    let request = try Icrc167()
    let second = try Icrc167()
    XCTAssertNotEqual(request.state, second.state)
    XCTAssertEqual(request.state.count, 32)
    XCTAssertNotEqual(Icrc167.derPublicKey(request.key), Icrc167.derPublicKey(second.key))
    let url = try request.authorizationURL()
    XCTAssertEqual(url.scheme, "https")
    XCTAssertEqual(url.host, "id.ai")
    XCTAssertEqual(url.path, "/authorize")
    XCTAssertNil(url.query)
    var fragment = URLComponents()
    fragment.percentEncodedQuery = try XCTUnwrap(
      URLComponents(url: url, resolvingAgainstBaseURL: false)?.percentEncodedFragment)
    let items = try XCTUnwrap(fragment.queryItems)
    XCTAssertEqual(
      items.first { $0.name == "callback" }?.value, "https://audit.oisy.com/signer-callback")
    XCTAssertEqual(items.first { $0.name == "state" }?.value, request.state)
    struct Request: Decodable {
      struct Params: Decodable {
        let publicKey: Data
        let maxTimeToLive: String
        let targets: [String]?
      }
      let method: String
      let params: Params
    }
    let message = try XCTUnwrap(items.first { $0.name == "message" }?.value?.data(using: .utf8))
    let decoded = try JSONDecoder().decode(Request.self, from: message)
    XCTAssertEqual(decoded.method, "icrc34_delegation")
    XCTAssertEqual(decoded.params.publicKey, Icrc167.derPublicKey(request.key))
    XCTAssertEqual(decoded.params.maxTimeToLive, "86400000000000")
    XCTAssertNil(decoded.params.targets)
    XCTAssertFalse(
      try XCTUnwrap(URLComponents(url: url, resolvingAgainstBaseURL: false)?.percentEncodedFragment)
        .contains("+"))
  }

  func testSingleAndBatchCallbacksPreserveSession() throws {
    let request = try Icrc167()
    let delegation = chain(request)
    for batch in [false, true] {
      let url = try callback(request, chain: delegation, batch: batch)
      let result = try request.session(from: url, now: now)
      XCTAssertEqual(result.chain, delegation)
      XCTAssertEqual(result.privateKey, request.key.rawRepresentation)
      XCTAssertEqual(result.expiresAt, now.addingTimeInterval(3600))
    }
  }

  private func extendedChain(_ request: Icrc167) throws -> DelegationChain {
    let issuer = P256.Signing.PrivateKey()
    let first = try XCTUnwrap(
      chain(request, pubkey: issuer.publicKey.derRepresentation).signerDelegation.first)
    let last = try XCTUnwrap(
      chain(request, expiration: "1800007200000000000").signerDelegation.first)
    let signature = try issuer.signature(for: last.signingMessage()).rawRepresentation
    return DelegationChain(
      publicKey: chain(request).publicKey,
      signerDelegation: [
        first, .init(delegation: last.delegation, signature: signature),
      ])
  }

  func testVerifiedTwoLinkCallbackUsesFinalKeyAndEarliestExpiry() throws {
    let request = try Icrc167()
    let delegated = try extendedChain(request)
    let session = try request.session(from: callback(request, chain: delegated), now: now)
    XCTAssertEqual(session.chain, delegated)
    XCTAssertEqual(session.expiresAt, now.addingTimeInterval(3600))
    XCTAssertEqual(
      session.principal,
      AuthSession(
        privateKey: request.key.rawRepresentation,
        chain: chain(request)
      ).principal)
    XCTAssertThrowsError(try session.validate(now: now.addingTimeInterval(3600)))
    let otherRequest = try Icrc167()
    XCTAssertThrowsError(
      try otherRequest.session(from: callback(otherRequest, chain: delegated), now: now))
  }

  func testChainedDelegationRejectsTamperingAndRestrictions() throws {
    let request = try Icrc167()
    let delegated = try extendedChain(request)
    let first = delegated.signerDelegation[0]
    let last = delegated.signerDelegation[1]
    var restricted = last.delegation
    restricted.permissions = "queries"
    let badLinks: [DelegationChain.SignedDelegation] = [
      try XCTUnwrap(chain(request, expiration: "invalid").signerDelegation.first),
      try XCTUnwrap(chain(request, expiration: "1800000000000000000").signerDelegation.first),
      try XCTUnwrap(chain(request, expiration: "+1800003600000000000").signerDelegation.first),
      try XCTUnwrap(chain(request, targets: []).signerDelegation.first),
      try XCTUnwrap(chain(request, pubkey: Data()).signerDelegation.first),
      .init(delegation: last.delegation, signature: Data()),
      .init(delegation: restricted, signature: last.signature),
    ]
    for bad in badLinks {
      for links in [[bad, last], [first, bad]] {
        let invalid = DelegationChain(publicKey: delegated.publicKey, signerDelegation: links)
        XCTAssertThrowsError(try request.session(from: callback(request, chain: invalid), now: now))
      }
    }
    var damaged = last.signature
    damaged[0] ^= 1
    let tampered = DelegationChain(
      publicKey: delegated.publicKey,
      signerDelegation: [
        first,
        .init(delegation: last.delegation, signature: damaged),
      ])
    XCTAssertThrowsError(try request.session(from: callback(request, chain: tampered), now: now))
    // Correct final key alone is insufficient: another issuer cannot sign this link.
    let unrelated = P256.Signing.PrivateKey()
    let wrongSignature = try unrelated.signature(for: last.signingMessage()).rawRepresentation
    let wrongIssuer = DelegationChain(
      publicKey: delegated.publicKey,
      signerDelegation: [
        first,
        .init(delegation: last.delegation, signature: wrongSignature),
      ])
    XCTAssertThrowsError(try request.session(from: callback(request, chain: wrongIssuer), now: now))
    let oversized = DelegationChain(
      publicKey: delegated.publicKey,
      signerDelegation: Array(repeating: last, count: 21))
    XCTAssertThrowsError(try request.session(from: callback(request, chain: oversized), now: now))
  }

  func testDelegationHashAndSignaturesMatchIndependentICPSDKVectors() throws {
    // Generated independently with @icp-sdk/core 4.2.3, DelegationChain.create and requestIdOf.
    let publicKey = try XCTUnwrap(
      Data(base64Encoded: "MCowBQYDK2VwAyEA6kpsY+KcUgq+9VB7Ey7F+ZVHdq6+vnuSQh7qaRRG0iw="))
    let fixtures = [
      (
        "MCowBQYDK2VwAyEA/RckOFqgx1tk+3jNYC+h2ZH96/drE8WO1wLqyDXp9hg=",
        "MaZ61wsJ6WdvnUKe1/dK/2x4oqGOKbLrHoBkoWI3WuiekQtVp/sA2lOHuPnT1HhO40SpT+jBlGh56Blg1lhyAA=="
      ),
      (
        "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAExdRR2jc+esfoLY3ktMrbwsqva92oCKyludgmMRBRc1j6guJDfGopQpKSRt8dOiS0byplPX2I6wYnhGrP4TxSvQ==",
        "mseJ/iy0eNllCBotoUo2CYNB16Dv0ve4lo7SKFL8AohR4cHWHT5JwLc6oRTQPlSMlC1Gb38r9D/Ccdb4nSmjFw=="
      ),
    ]
    for (issuer, signature) in fixtures {
      let signed = DelegationChain.SignedDelegation(
        delegation: .init(pubkey: publicKey, expiration: "1800003600000000000", targets: nil),
        signature: try XCTUnwrap(Data(base64Encoded: signature)))
      let message = try signed.signingMessage()
      XCTAssertEqual(message.prefix(27), Data([0x1a]) + Data("ic-request-auth-delegation".utf8))
      XCTAssertEqual(
        message.suffix(32).map { String(format: "%02x", $0) }.joined(),
        "0c363855c0eb9471ed6f3be442528018933533e0b0f7e8548e75bab905b4307a")
      try signed.verify(issuer: XCTUnwrap(Data(base64Encoded: issuer)))
      XCTAssertThrowsError(try signed.verify(issuer: Data([0])))
    }
  }

  @MainActor
  func testChainedSessionPersistsAndRestoresInKeychain() throws {
    let request = try Icrc167()
    let session = AuthSession(
      privateKey: request.key.rawRepresentation, chain: try extendedChain(request))
    let store = KeychainStore(service: "com.oisy.native.mvp.tests.\(UUID().uuidString)")
    defer { try? store.clear() }
    try store.save(session)
    let restored = try XCTUnwrap(store.load())
    XCTAssertEqual(restored, session)
    try restored.validate(now: now)
  }

  func testRejectsWrongStateKeyExpiryTargetsAndRequestID() throws {
    let request = try Icrc167()
    let cases = [
      try callback(request, chain: chain(request), state: "wrong"),
      try callback(request, chain: chain(request, pubkey: Data([0]))),
      try callback(request, chain: chain(request, expiration: "1800000000000000000")),
      try callback(request, chain: chain(request, expiration: "invalid")),
      try callback(request, chain: chain(request, targets: ["aaaaa-aa"])),
      try callback(request, chain: chain(request), id: 2),
      try callback(request, chain: .init(publicKey: Data(), signerDelegation: [])),
    ]
    for url in cases { XCTAssertThrowsError(try request.session(from: url, now: now)) }
  }

  func testCallbackRejectsLifetimeBeyondRequestedBound() throws {
    let request = try Icrc167()
    let limit =
      UInt64(now.timeIntervalSince1970) * 1_000_000_000
      + Icrc167.timeToLiveNanoseconds + 300_000_000_000
    let accepted = chain(request, expiration: String(limit))
    XCTAssertNoThrow(try request.session(from: callback(request, chain: accepted), now: now))
    let excessive = chain(request, expiration: String(limit + 1_000_000_000))
    XCTAssertThrowsError(try request.session(from: callback(request, chain: excessive), now: now))
    let padded = chain(request, expiration: "000000000000000000001800003600000000000")
    XCTAssertThrowsError(try request.session(from: callback(request, chain: padded), now: now))
  }

  func testCallbackRejectsRepeatedKeysEvenWithValidLinkSignatures() throws {
    let request = try Icrc167()
    let first = try XCTUnwrap(chain(request).signerDelegation.first)
    let repeated = DelegationChain.SignedDelegation(
      delegation: first.delegation,
      signature: try request.key.signature(for: first.signingMessage()))
    let cycle = DelegationChain(
      publicKey: chain(request).publicKey, signerDelegation: [first, repeated])
    XCTAssertThrowsError(try request.session(from: callback(request, chain: cycle), now: now))
    let repeatedRoot = DelegationChain(
      publicKey: Icrc167.derPublicKey(request.key), signerDelegation: [first])
    XCTAssertThrowsError(
      try request.session(from: callback(request, chain: repeatedRoot), now: now))
  }

  func testRejectsCallbackLookalikesAndDuplicateParameters() throws {
    let request = try Icrc167()
    let valid = try callback(request, chain: chain(request))
    for prefix in [
      "oisy://auth-callback.evil", "https://auth-callback", "oisy://user@auth-callback",
      "oisy://auth-callback:42", "oisy://auth-callback/other",
    ] {
      let wrong = try XCTUnwrap(
        URL(
          string: valid.absoluteString.replacingOccurrences(
            of: "oisy://auth-callback", with: prefix)))
      XCTAssertThrowsError(try request.session(from: wrong, now: now))
    }
    let duplicate = try XCTUnwrap(URL(string: valid.absoluteString + "&state=" + request.state))
    XCTAssertThrowsError(try request.session(from: duplicate, now: now))
    XCTAssertThrowsError(
      try request.session(
        from: XCTUnwrap(URL(string: "oisy://auth-callback#message=bad")), now: now))
  }

  func testPrincipalMatchesICPSDKVector() {
    let der =
      Data([0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00])
      + Data(repeating: 0, count: 32)
    // Generated independently with @icp-sdk/core/principal Principal.selfAuthenticating.
    XCTAssertEqual(
      Principal.selfAuthenticating(publicKey: der),
      "ukev2-6iweo-izmyj-rdxlb-jun6n-nef5z-gk2lp-fuzke-7ghpu-jecqq-iae")
  }

  @MainActor
  func testKeychainRelaunchExpiryAndSignOut() throws {
    let request = try Icrc167()
    let expiry = String(
      UInt64(Date.now.addingTimeInterval(3600).timeIntervalSince1970) * 1_000_000_000)
    let session = AuthSession(
      privateKey: request.key.rawRepresentation, chain: chain(request, expiration: expiry))
    let store = KeychainStore(service: "com.oisy.native.mvp.tests.\(UUID().uuidString)")
    defer { try? store.clear() }
    XCTAssertNil(try store.load())
    try store.save(session)
    try store.save(session)  // Updating an existing Keychain item must preserve the session.
    XCTAssertEqual(try store.load(), session)
    let relaunched = AuthModel(store: store)
    XCTAssertEqual(relaunched.session?.principal, session.principal)
    relaunched.restore(now: session.expiresAt)
    XCTAssertNil(relaunched.session)
    XCTAssertNil(try store.load())
    try store.save(session)
    let signedIn = AuthModel(store: store)
    signedIn.signOut()
    XCTAssertNil(signedIn.session)
    XCTAssertNil(try store.load())
    XCTAssertNil(AuthModel(store: store).session)
  }

  @MainActor
  func testExpiredWebSessionSignsOutAndCannotRestoreParentFromKeychain() throws {
    let session = try fixtureSession(
      key: Curve25519.Signing.PrivateKey(), expiry: .now.addingTimeInterval(3600))
    let store = KeychainStore(service: "com.oisy.native.mvp.expiry-tests.\(UUID().uuidString)")
    defer { try? store.clear() }
    try store.save(session)
    let auth = AuthModel(store: store)
    auth.expire(session)
    XCTAssertNil(auth.session)
    XCTAssertEqual(auth.errorMessage, AuthError.expired.localizedDescription)
    XCTAssertNil(try store.load())
    auth.restore()
    XCTAssertNil(auth.session)
    XCTAssertNil(AuthModel(store: store).session)
  }

  @MainActor
  func testDelayedExpiryCannotLogOutNewSession() throws {
    let old = try fixtureSession(
      key: Curve25519.Signing.PrivateKey(), expiry: .now.addingTimeInterval(3600))
    let current = try fixtureSession(
      key: Curve25519.Signing.PrivateKey(), expiry: .now.addingTimeInterval(3600))
    let store = KeychainStore(service: "com.oisy.native.mvp.expiry-tests.\(UUID().uuidString)")
    defer { try? store.clear() }
    try store.save(current)
    let auth = AuthModel(store: store)
    auth.expire(old)
    XCTAssertEqual(auth.session, current)
    XCTAssertEqual(try store.load(), current)
    XCTAssertNil(auth.errorMessage)
  }

  @MainActor
  func testWelcomeBackRequiresSuccessfulSessionAndSurvivesExpiry() throws {
    let name = "oisy.welcome.tests.\(UUID())"
    let store = KeychainStore(service: name)
    let preferences = try XCTUnwrap(UserDefaults(suiteName: name))
    defer {
      try? store.clear()
      preferences.removePersistentDomain(forName: name)
    }
    let first = AuthModel(store: store, preferences: preferences)
    XCTAssertFalse(first.showsWelcomeBack)
    first.signOut()
    XCTAssertFalse(AuthModel(store: store, preferences: preferences).showsWelcomeBack)

    let session = try fixtureSession(
      key: Curve25519.Signing.PrivateKey(), expiry: .now.addingTimeInterval(600))
    try store.save(session)
    first.restore()
    XCTAssertTrue(first.showsWelcomeBack)
    first.expire(session)
    XCTAssertNil(first.session)
    XCTAssertNil(try store.load())
    let returning = AuthModel(store: store, preferences: preferences)
    XCTAssertTrue(returning.showsWelcomeBack)
    XCTAssertNil(returning.session, "Welcome history never authenticates a session")
  }

  @MainActor
  func testExistingSessionMigratesWelcomeHistoryBeforeExpiryCleanup() throws {
    let name = "oisy.welcome.migration.\(UUID())"
    let store = KeychainStore(service: name)
    let preferences = try XCTUnwrap(UserDefaults(suiteName: name))
    defer {
      try? store.clear()
      preferences.removePersistentDomain(forName: name)
    }
    let auth = AuthModel(store: store, preferences: preferences)
    let session = try fixtureSession(
      key: Curve25519.Signing.PrivateKey(), expiry: .now.addingTimeInterval(600))
    try store.save(session)
    auth.restore(now: session.expiresAt)
    XCTAssertTrue(auth.showsWelcomeBack)
    XCTAssertNil(auth.session)
    XCTAssertNil(try store.load())
    XCTAssertTrue(AuthModel(store: store, preferences: preferences).showsWelcomeBack)
  }

  @MainActor
  func testExplicitSignOutShowsIntroductionAfterRelaunchAndIgnoresLateExpiry() throws {
    let name = "oisy.welcome.explicit-signout.\(UUID())"
    let store = KeychainStore(service: name)
    let preferences = try XCTUnwrap(UserDefaults(suiteName: name))
    defer {
      try? store.clear()
      preferences.removePersistentDomain(forName: name)
    }
    let session = try fixtureSession(
      key: Curve25519.Signing.PrivateKey(), expiry: .now.addingTimeInterval(600))
    try store.save(session)
    let auth = AuthModel(store: store, preferences: preferences)
    XCTAssertTrue(auth.showsWelcomeBack)
    auth.signOut()
    XCTAssertFalse(auth.showsWelcomeBack)
    XCTAssertNil(auth.session)
    XCTAssertNil(try store.load())
    XCTAssertNil(auth.errorMessage)
    auth.expire(session)
    XCTAssertFalse(auth.showsWelcomeBack, "A delayed expiry must not undo explicit logout")
    XCTAssertNil(auth.errorMessage)
    XCTAssertFalse(AuthModel(store: store, preferences: preferences).showsWelcomeBack)

    // Signing in again restores returning presentation for a subsequent expiry.
    try store.save(session)
    auth.restore()
    auth.expire(session)
    XCTAssertTrue(auth.showsWelcomeBack)
    auth.signOut()
    XCTAssertFalse(AuthModel(store: store, preferences: preferences).showsWelcomeBack)
  }

}
