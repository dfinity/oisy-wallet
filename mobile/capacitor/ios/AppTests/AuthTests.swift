import CryptoKit
import XCTest

@testable import App

@MainActor final class AuthTests: XCTestCase {
  func testRestoreKeepsOriginalDeadlineAndExplicitLogoutShowsIntroduction() async throws {
    let store = TestAuthStore()
    try store.save(fixtureSession(key: .init(), expiry: .now.addingTimeInterval(3600)))
    let model = AuthModel(store: store)
    let original = try XCTUnwrap(model.session)
    await model.restore()
    XCTAssertEqual(model.session, original)
    model.signOut()
    XCTAssertNil(model.session)
    XCTAssertFalse(model.showsWelcomeBack)
    for _ in 0..<10 { await Task.yield() }
    await model.restore()
    XCTAssertNil(model.session)
  }
  func testExpiryShowsWelcomeBackAndStaleExpiryCannotEndNewLogin() async throws {
    let store = TestAuthStore()
    let old = try fixtureSession(key: .init(), expiry: .now.addingTimeInterval(60))
    let current = try fixtureSession(key: .init(), expiry: .now.addingTimeInterval(3600))
    try store.save(current)
    let model = AuthModel(store: store)
    model.expire(old)
    XCTAssertEqual(model.session, current)
    await model.restore(now: current.expiresAt)
    XCTAssertNil(model.session)
    XCTAssertTrue(model.showsWelcomeBack)
  }
  func testStorageFailureDoesNotPublishAnonymousSessionOrClearValidAccount() async throws {
    let store = TestAuthStore()
    try store.save(fixtureSession(key: .init(), expiry: .now.addingTimeInterval(600)))
    let model = AuthModel(store: store)
    let original = model.session
    store.failure = AuthError.storage
    await model.restore()
    XCTAssertEqual(model.session, original)
    XCTAssertNotNil(model.errorMessage)
  }
  func testLogoutTombstonePreventsCrashRestoreEvenIfRevocationFails() async throws {
    let name = "oisy.sdk.auth.\(UUID())"
    let preferences = try XCTUnwrap(UserDefaults(suiteName: name))
    defer { preferences.removePersistentDomain(forName: name) }
    let store = TestAuthStore(service: name)
    try store.save(fixtureSession(key: .init(), expiry: .now.addingTimeInterval(600)))
    let model = AuthModel(store: store, preferences: preferences)
    store.failure = AuthError.storage
    model.signOut()
    for _ in 0..<10 { await Task.yield() }
    let restored = AuthModel(
      backend: store, preferences: preferences,
      preferenceKey: name + ".hasSignedIn", removeLegacy: {})
    await restored.restore()
    XCTAssertNil(restored.session)
    XCTAssertFalse(restored.showsWelcomeBack)
    store.failure = nil
    await restored.restore()
    XCTAssertNil(restored.session)
    XCTAssertNil(store.value)
  }
  func testFreshClientCannotRestoreWhenSDKReportsSuccessfulCleanupButKeepsRecords() async throws {
    let name = "oisy.sdk.auth.\(UUID())"
    let preferences = try XCTUnwrap(UserDefaults(suiteName: name))
    defer { preferences.removePersistentDomain(forName: name) }
    let original = try fixtureSession(key: .init(), expiry: .now.addingTimeInterval(600))
    let store = TestAuthStore(service: name)
    try store.save(original)
    store.preservesValueOnSignOut = true
    let model = AuthModel(store: store, preferences: preferences)
    model.signOut()
    for _ in 0..<100 where model.isSigningIn { await Task.yield() }
    XCTAssertFalse(model.isSigningIn)
    XCTAssertNil(model.session)
    XCTAssertEqual(store.value, original)
    XCTAssertTrue(preferences.bool(forKey: name + ".hasSignedIn.sdkLogoutPending"))

    // Recreate both the client and model: the SDK has no live in-memory session
    // to revoke, but its old credential records survived swallowed removal errors.
    let freshClient = TestAuthStore(service: name)
    try freshClient.save(original)
    freshClient.preservesValueOnSignOut = true
    let restored = AuthModel(
      backend: freshClient, preferences: preferences,
      preferenceKey: name + ".hasSignedIn", removeLegacy: {})
    await restored.restore()
    await restored.restore()
    XCTAssertNil(restored.session)
    XCTAssertFalse(restored.showsWelcomeBack)
    XCTAssertEqual(freshClient.restoreCalls, 0)
    XCTAssertEqual(freshClient.signOutCalls, 2)
    XCTAssertEqual(freshClient.value, original)
    XCTAssertTrue(preferences.bool(forKey: name + ".hasSignedIn.sdkLogoutPending"))
  }
  func testOnlySuccessfulExplicitSignInLiftsTheLogoutTombstone() async throws {
    let name = "oisy.sdk.auth.\(UUID())"
    let preferences = try XCTUnwrap(UserDefaults(suiteName: name))
    defer { preferences.removePersistentDomain(forName: name) }
    let marker = name + ".hasSignedIn.sdkLogoutPending"
    preferences.set(true, forKey: marker)
    let store = TestAuthStore(service: name)
    let model = AuthModel(
      backend: store, preferences: preferences,
      preferenceKey: name + ".hasSignedIn", removeLegacy: {})
    store.pendingSignIn = { throw CancellationError() }
    await model.signIn()
    XCTAssertNil(model.session)
    XCTAssertTrue(preferences.bool(forKey: marker))

    let replacement = try fixtureSession(key: .init(), expiry: .now.addingTimeInterval(600))
    store.pendingSignIn = {
      try store.save(replacement)
      return replacement
    }
    await model.signIn()
    XCTAssertEqual(model.session, replacement)
    XCTAssertTrue(model.showsWelcomeBack)
    XCTAssertFalse(preferences.bool(forKey: marker))
    let restored = AuthModel(
      backend: store, preferences: preferences,
      preferenceKey: name + ".hasSignedIn", removeLegacy: {})
    await restored.restore()
    XCTAssertEqual(restored.session, replacement)
  }
  func testLogoutWaitsForAnInFlightRestoreBeforeDiscardingSDKState() async throws {
    let name = "oisy.sdk.auth.\(UUID())"
    let preferences = try XCTUnwrap(UserDefaults(suiteName: name))
    defer { preferences.removePersistentDomain(forName: name) }
    let store = TestAuthStore(service: name)
    let original = try fixtureSession(key: .init(), expiry: .now.addingTimeInterval(600))
    try store.save(original)
    var answer: CheckedContinuation<AuthSession?, Error>?
    store.pendingRestore = { try await withCheckedThrowingContinuation { answer = $0 } }
    let model = AuthModel(store: store, preferences: preferences)
    let restoring = Task { await model.restore() }
    for _ in 0..<100 where answer == nil { await Task.yield() }
    XCTAssertNotNil(answer)
    model.signOut()
    XCTAssertNil(model.session)
    for _ in 0..<10 { await Task.yield() }
    XCTAssertEqual(store.signOutCalls, 0)
    answer?.resume(returning: original)
    await restoring.value
    for _ in 0..<100 where model.isSigningIn { await Task.yield() }
    XCTAssertFalse(model.isSigningIn)
    XCTAssertEqual(store.signOutCalls, 1)
    XCTAssertNil(store.value)
    XCTAssertNil(model.session)
    XCTAssertFalse(model.showsWelcomeBack)
    XCTAssertTrue(preferences.bool(forKey: name + ".hasSignedIn.sdkLogoutPending"))
  }
  func testExplicitSignInCannotRaceAnInFlightRestore() async throws {
    let store = TestAuthStore()
    var answer: CheckedContinuation<AuthSession?, Error>?
    store.pendingRestore = { try await withCheckedThrowingContinuation { answer = $0 } }
    let model = AuthModel(store: store)
    let restoring = Task { await model.restore() }
    for _ in 0..<100 where answer == nil { await Task.yield() }
    XCTAssertNotNil(answer)
    XCTAssertTrue(model.isSigningIn)
    await model.signIn()
    XCTAssertEqual(store.signInCalls, 0)
    answer?.resume(returning: nil)
    await restoring.value
    XCTAssertFalse(model.isSigningIn)
    let replacement = try fixtureSession(key: .init(), expiry: .now.addingTimeInterval(600))
    try store.save(replacement)
    await model.signIn()
    XCTAssertEqual(store.signInCalls, 1)
    XCTAssertEqual(model.session, replacement)
  }
  func testLateSignInCannotResurrectLoggedOutSession() async throws {
    let store = TestAuthStore()
    var answer: CheckedContinuation<AuthSession, Error>?
    store.pendingSignIn = { try await withCheckedThrowingContinuation { answer = $0 } }
    let model = AuthModel(store: store)
    let task = Task { await model.signIn() }
    for _ in 0..<10 where answer == nil { await Task.yield() }
    XCTAssertNotNil(answer)
    model.signOut()
    answer?.resume(
      returning: try fixtureSession(key: .init(), expiry: .now.addingTimeInterval(600)))
    await task.value
    XCTAssertNil(model.session)
    XCTAssertFalse(model.showsWelcomeBack)
  }
  func testOverlongSDKGrantCannotBecomeActive() async throws {
    let store = TestAuthStore()
    store.pendingSignIn = {
      try fixtureSession(key: .init(), expiry: .now.addingTimeInterval(7200))
    }
    let model = AuthModel(store: store)
    await model.signIn()
    XCTAssertNil(model.session)
    XCTAssertNotNil(model.errorMessage)
  }
  func testDefaultSDKUsesIndependentStoreAndRestoresSignedOut() async {
    let model = AuthModel()
    await model.restore()
    XCTAssertNil(model.session)
    XCTAssertNil(model.errorMessage)
  }
}
