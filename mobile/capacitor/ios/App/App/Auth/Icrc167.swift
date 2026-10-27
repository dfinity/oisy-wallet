import CryptoKit
import Foundation
import Security

struct Icrc167 {
  static let timeToLiveNanoseconds: UInt64 = 86_400_000_000_000
  // Match icp-native-sdk’s allowance for issuer/device clock skew.
  static let clockSkewSeconds: TimeInterval = 300
  let key: Curve25519.Signing.PrivateKey
  let state: String

  init() throws {
    key = Curve25519.Signing.PrivateKey()
    var bytes = [UInt8](repeating: 0, count: 16)
    guard SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) == errSecSuccess else {
      throw AuthError.randomGeneration
    }
    state = bytes.map { String(format: "%02x", $0) }.joined()
  }

  static func derPublicKey(_ key: Curve25519.Signing.PrivateKey) -> Data {
    Data([0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00])
      + key.publicKey.rawRepresentation
  }

  func authorizationURL() throws -> URL {
    struct Request: Encodable {
      struct Params: Encodable {
        let publicKey: Data
        let maxTimeToLive: String
      }
      let jsonrpc = "2.0"
      let id = 1
      let method = "icrc34_delegation"
      let params: Params
    }
    let request = Request(
      params: .init(
        publicKey: Self.derPublicKey(key), maxTimeToLive: String(Self.timeToLiveNanoseconds)))
    let data = try JSONEncoder().encode(request)
    guard let message = String(data: data, encoding: .utf8) else { throw AuthError.invalidResponse }
    var fragment = URLComponents()
    fragment.queryItems = [
      URLQueryItem(name: "message", value: message),
      URLQueryItem(name: "callback", value: "https://audit.oisy.com/signer-callback"),
      URLQueryItem(name: "state", value: state),
    ]
    var url = URLComponents()
    url.scheme = "https"
    url.host = "id.ai"
    url.path = "/authorize"
    // URLSearchParams uses form encoding: literal base64 '+' must not decode as a space.
    url.percentEncodedFragment = fragment.percentEncodedQuery?.replacingOccurrences(
      of: "+", with: "%2B")
    guard let result = url.url else { throw AuthError.invalidResponse }
    return result
  }

  func session(from url: URL, now: Date = .now) throws -> AuthSession {
    guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
      components.scheme == "oisy", components.host == "auth-callback",
      components.user == nil, components.password == nil, components.port == nil,
      components.path.isEmpty || components.path == "/", components.query == nil,
      let fragment = components.percentEncodedFragment, fragment.utf8.count <= 65_536
    else { throw AuthError.invalidResponse }
    var parameters: [String: String] = [:]
    for part in fragment.split(separator: "&") {
      let pair = part.split(separator: "=", maxSplits: 1, omittingEmptySubsequences: false)
      guard pair.count == 2,
        let name = String(pair[0]).replacingOccurrences(of: "+", with: " ").removingPercentEncoding,
        let value = String(pair[1]).replacingOccurrences(of: "+", with: " ")
          .removingPercentEncoding,
        parameters[name] == nil
      else { throw AuthError.invalidResponse }
      parameters[name] = value
    }
    guard parameters["state"] == state, let message = parameters["message"]?.data(using: .utf8)
    else {
      throw AuthError.invalidResponse
    }
    struct Response: Decodable {
      struct RPCError: Decodable { let code: Int }
      let jsonrpc: String
      let id: Int
      let result: DelegationChain?
      let error: RPCError?
    }
    let decoder = JSONDecoder()
    let responses: [Response]
    do {
      if let batch = try? decoder.decode([Response].self, from: message) {
        responses = batch
      } else {
        responses = [try decoder.decode(Response.self, from: message)]
      }
    } catch { throw AuthError.invalidResponse }
    guard responses.count == 1, let response = responses.first,
      response.jsonrpc == "2.0", response.id == 1
    else { throw AuthError.invalidResponse }
    guard response.error == nil else { throw AuthError.signIn }
    guard let chain = response.result else { throw AuthError.invalidResponse }
    let session = AuthSession(privateKey: key.rawRepresentation, chain: chain)
    try session.validate(now: now)
    // The replica enforces the returned chain, not the lifetime we requested.
    let maximumExpiry = now.addingTimeInterval(
      Double(Self.timeToLiveNanoseconds) / 1_000_000_000 + Self.clockSkewSeconds)
    guard session.expiresAt <= maximumExpiry else { throw AuthError.invalidResponse }
    return session
  }
}
