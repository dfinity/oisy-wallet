import Foundation

/// II-scoped native → web session grant. The web SDK mints the app credential.
struct WebDelegation: Encodable {
  let version = 1
  let id: String
  let principal: String
  let expiresAt: Double
  let chain: DelegationJSON
}
