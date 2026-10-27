import AuthenticationServices
import Observation
import SwiftUI

@MainActor
@Observable
final class AuthModel {
  private(set) var session: AuthSession?
  private(set) var showsWelcomeBack: Bool
  private(set) var isSigningIn = false
  private(set) var errorMessage: String?
  private let store: KeychainStore
  private let preferences: UserDefaults
  // Preserve the preference key used by the preceding preview build.
  private var welcomePreferenceKey: String { store.service + ".hasSignedIn" }
  private var generation = UUID()
  private var needsSessionRemoval = false

  init(store: KeychainStore = KeychainStore(), preferences: UserDefaults = .standard) {
    self.store = store
    self.preferences = preferences
    showsWelcomeBack = preferences.bool(forKey: store.service + ".hasSignedIn")
    restore()
  }

  func restore(now: Date = .now) {
    guard !isSigningIn else { return }
    do {
      if needsSessionRemoval {
        try store.clear()
        needsSessionRemoval = false
      }
      let saved = try store.load()
      try saved?.validate(now: now)
      if saved != nil { setWelcomeBack(true) }
      session = saved
    } catch AuthError.expired {
      // A previously stored session can predate the welcome preference.
      setWelcomeBack(true)
      clearSession()
      if !needsSessionRemoval { errorMessage = AuthError.expired.localizedDescription }
    } catch {
      session = nil
      errorMessage = AuthError.storage.localizedDescription
    }
  }

  func signIn(using browser: WebAuthenticationSession) async {
    guard !isSigningIn else { return }
    isSigningIn = true
    let generation = generation
    errorMessage = nil
    defer { isSigningIn = false }
    do {
      let request = try Icrc167()
      let callback = try await browser.authenticate(
        using: request.authorizationURL(), callback: .customScheme("oisy"),
        preferredBrowserSession: .shared, additionalHeaderFields: [:])
      guard generation == self.generation, !Task.isCancelled else { return }
      let authenticated = try request.session(from: callback)
      try store.save(authenticated)
      needsSessionRemoval = false
      setWelcomeBack(true)
      session = authenticated
    } catch let error as ASWebAuthenticationSessionError where error.code == .canceledLogin {
      // Cancellation leaves the signed-out screen without an alert.
    } catch is CancellationError {
    } catch is KeychainFailure {
      guard generation == self.generation else { return }
      errorMessage = AuthError.storage.localizedDescription
    } catch {
      guard generation == self.generation else { return }
      errorMessage = (error as? AuthError ?? .signIn).localizedDescription
    }
  }

  private func setWelcomeBack(_ show: Bool) {
    // Presentation only: no account identifier or key is stored here.
    showsWelcomeBack = show
    preferences.set(show, forKey: welcomePreferenceKey)
  }

  func expire(_ expiredSession: AuthSession) {
    // A delayed callback from an old WebView must not end a newer sign-in.
    guard session == expiredSession else { return }
    setWelcomeBack(true)
    clearSession()
    if !needsSessionRemoval { errorMessage = AuthError.expired.localizedDescription }
  }

  func signOut() {
    setWelcomeBack(false)
    clearSession()
  }

  private func clearSession() {
    generation = UUID()
    session = nil
    needsSessionRemoval = true
    do {
      try store.clear()
      needsSessionRemoval = false
      errorMessage = nil
    } catch {
      errorMessage = AuthError.storage.localizedDescription
    }
  }
}
