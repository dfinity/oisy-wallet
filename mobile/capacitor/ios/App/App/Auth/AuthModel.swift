import IcpSdkAuth
import Observation
import SwiftUI

@MainActor
@Observable
final class AuthModel {
  private(set) var session: AuthSession?
  private(set) var showsWelcomeBack: Bool
  private(set) var isSigningIn = false
  private(set) var errorMessage: String?
  private let backend: (any AuthenticationBackend)?
  private let preferences: UserDefaults
  private let welcomePreferenceKey: String
  private var generation = UUID()
  private var restoration: Task<AuthSession?, Error>?
  private let removeLegacy: () throws -> Void

  init(
    backend: (any AuthenticationBackend)? = nil, preferences: UserDefaults = .standard,
    preferenceKey: String = LegacyCredentialStore.legacyService + ".hasSignedIn",
    initialSession: AuthSession? = nil,
    removeLegacy: @escaping () throws -> Void = { try LegacyCredentialStore().clear() }
  ) {
    self.preferences = preferences
    welcomePreferenceKey = preferenceKey
    self.removeLegacy = removeLegacy
    showsWelcomeBack = preferences.bool(forKey: preferenceKey)
    session = preferences.bool(forKey: preferenceKey + ".sdkLogoutPending") ? nil : initialSession
    do { self.backend = try backend ?? SDKAuthentication() } catch {
      self.backend = nil
      errorMessage = AuthError.storage.localizedDescription
    }
  }

  func restore(now: Date = .now) async {
    guard !isSigningIn, restoration == nil, let backend else { return }
    let pending = generation
    let remainsSignedOut = preferences.bool(forKey: welcomePreferenceKey + ".sdkLogoutPending")
    // Restore and explicit authentication must not race over SDK credential storage.
    isSigningIn = true
    let task = Task { @MainActor in
      if remainsSignedOut {
        try removeLegacy()
        try await backend.signOut()
        return Optional<AuthSession>.none
      }
      return try await backend.restore()
    }
    restoration = task
    defer {
      restoration = nil
      if pending == generation { isSigningIn = false }
    }
    do {
      let saved = try await task.value
      guard pending == generation else { return }
      // The SDK can report success after swallowing local deletion errors. Only
      // a successful explicit sign-in may lift this durable logout boundary.
      guard !remainsSignedOut else { return }
      if let saved, saved.expiresAt <= now { throw AuthError.expired }
      session = saved
      if saved != nil { setWelcomeBack(true) }
      errorMessage = nil
    } catch AuthError.expired {
      guard pending == generation, !remainsSignedOut else { return }
      endSession(returning: true)
    } catch {
      guard pending == generation else { return }
      // Retry platform/network failures; never replace an existing session with anonymous data.
      errorMessage = AuthError.storage.localizedDescription
    }
  }

  func signIn() async {
    guard !isSigningIn, restoration == nil, let backend else { return }
    isSigningIn = true
    generation = UUID()
    let pending = generation
    errorMessage = nil
    defer { if pending == generation { isSigningIn = false } }
    do {
      let authenticated = try await backend.signIn()
      guard pending == generation, !Task.isCancelled else { return }
      guard authenticated.expiresAt > .now,
        authenticated.expiresAt <= .now.addingTimeInterval(AuthSession.duration)
      else { throw AuthError.invalidResponse }
      try removeLegacy()
      preferences.removeObject(forKey: welcomePreferenceKey + ".sdkLogoutPending")
      setWelcomeBack(true)
      session = authenticated
    } catch IcpSdkAuth.AuthError.host(_, .Cancelled) {
      // System-browser cancellation leaves the signed-out screen without an alert.
    } catch is CancellationError {
    } catch {
      guard pending == generation else { return }
      errorMessage = (error as? AuthError ?? .signIn).localizedDescription
    }
  }

  private func setWelcomeBack(_ value: Bool) {
    showsWelcomeBack = value
    preferences.set(value, forKey: welcomePreferenceKey)
  }
  func expire(_ expired: AuthSession) {
    guard session == expired else { return }
    endSession(returning: true)
  }
  func signOut() { endSession(returning: false) }

  private func endSession(returning: Bool) {
    generation = UUID()
    let pending = generation
    session = nil
    setWelcomeBack(returning)
    isSigningIn = true
    errorMessage = returning ? AuthError.expired.localizedDescription : nil
    // Persist a local logout before any awaited revocation; a crash must not restore it.
    preferences.set(true, forKey: welcomePreferenceKey + ".sdkLogoutPending")
    let pendingRestore = restoration
    Task { [weak self] in
      guard let self else { return }
      defer { if pending == generation { isSigningIn = false } }
      do {
        // A late SDK restore must finish before cleanup can discard its authority.
        if let pendingRestore { _ = await pendingRestore.result }
        try removeLegacy()
        guard let backend else { throw AuthError.storage }
        try await backend.signOut()
        // Keep the tombstone until a fresh explicit sign-in replaces this session.
      } catch {
        if pending == generation { errorMessage = AuthError.storage.localizedDescription }
      }
    }
  }
}
