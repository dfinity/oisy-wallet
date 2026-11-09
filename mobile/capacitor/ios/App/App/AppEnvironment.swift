import Foundation

/// Public build configuration shared with the web SDK and deployment preflight.
struct AppEnvironment: Decodable {
  let environment: String
  let derivationOrigin: String
  let authCallbackURL: String
  let internetIdentityAuthorizeURL: String
  let internetIdentityCanisterID: String
  let internetComputerHost: String
  let teamID: String
  let deviceBundleID: String
  let simulatorBundleID: String
  let legacyKeychainService: String
  let sdkKeyTagPrefix: String
  let sdkStorageDirectory: String

  static func load(bundle: Bundle = .main) throws -> AppEnvironment {
    guard let url = bundle.url(forResource: "app-environment", withExtension: "json") else {
      throw AuthError.storage
    }
    return try JSONDecoder().decode(Self.self, from: Data(contentsOf: url))
  }
}
