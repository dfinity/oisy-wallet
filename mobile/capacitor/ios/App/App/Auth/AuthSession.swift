import Foundation

/// Public session metadata. SDK key handles never leave SDK platform storage.
struct AuthSession: Equatable {
  static let duration: TimeInterval = 60 * 60
  let id: UUID
  let principal: String
  let expiresAt: Date
  let delegate: @MainActor (Data) async throws -> WebDelegation

  static func == (lhs: Self, rhs: Self) -> Bool { lhs.id == rhs.id }
}

enum AuthError: Error, LocalizedError {
  case invalidResponse, expired, storage, signIn
  var errorDescription: String? {
    switch self {
    case .invalidResponse: String(localized: "auth.error.invalid_response")
    case .expired: String(localized: "auth.error.expired")
    case .signIn: String(localized: "auth.error.sign_in")
    case .storage: String(localized: "auth.error.storage")
    }
  }
}
