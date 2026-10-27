import CryptoKit
import Foundation

struct DelegationChain: Codable, Equatable {
  struct SignedDelegation: Codable, Equatable {
    struct Delegation: Codable, Equatable {
      let pubkey: Data
      let expiration: String
      let targets: [String]?
      var permissions: String? = nil
    }
    let delegation: Delegation
    let signature: Data
  }
  let publicKey: Data
  let signerDelegation: [SignedDelegation]
}

struct AuthSession: Codable, Equatable {
  let privateKey: Data
  let chain: DelegationChain

  var principal: String { Principal.selfAuthenticating(publicKey: chain.publicKey) }
  var expiresAt: Date {
    let expiration =
      chain.signerDelegation.compactMap { UInt64($0.delegation.expiration) }.min() ?? 0
    return Date(timeIntervalSince1970: Double(expiration) / 1_000_000_000)
  }

  func validate(now: Date = .now) throws {
    let key = try Curve25519.Signing.PrivateKey(rawRepresentation: privateKey)
    // Root canister-signature verification remains outside this local preview.
    // Every additional link must prove it was signed by the preceding key.
    guard !chain.publicKey.isEmpty, chain.publicKey.count <= 4096,
      (1...20).contains(chain.signerDelegation.count),
      chain.signerDelegation.last?.delegation.pubkey == Icrc167.derPublicKey(key)
    else { throw AuthError.invalidResponse }
    var seenKeys: Set<Data> = [chain.publicKey]
    for (index, signed) in chain.signerDelegation.enumerated() {
      guard seenKeys.insert(signed.delegation.pubkey).inserted,
        !signed.delegation.pubkey.isEmpty, signed.delegation.pubkey.count <= 4096,
        signed.delegation.targets == nil, signed.delegation.permissions == nil,
        !signed.signature.isEmpty, signed.signature.count <= 16_384,
        (1...20).contains(signed.delegation.expiration.utf8.count),
        signed.delegation.expiration.utf8.allSatisfy({ (48...57).contains($0) }),
        UInt64(signed.delegation.expiration) != nil
      else { throw AuthError.invalidResponse }
      if index > 0 {
        try signed.verify(issuer: chain.signerDelegation[index - 1].delegation.pubkey)
      }
    }
    guard expiresAt > now else { throw AuthError.expired }
  }
}

extension DelegationChain.SignedDelegation {
  // IC representation-independent hash, limited to untargeted, unrestricted delegations.
  // Reject unsupported fields before hashing so signed restrictions are never discarded.
  func signingMessage() throws -> Data {
    guard delegation.targets == nil, delegation.permissions == nil,
      let expiration = UInt64(delegation.expiration)
    else { throw AuthError.invalidResponse }
    var remaining = expiration
    var encoded = Data()
    repeat {
      let byte = UInt8(remaining & 0x7f)
      remaining >>= 7
      encoded.append(byte | (remaining == 0 ? 0 : 0x80))
    } while remaining != 0
    let fields = [("pubkey", delegation.pubkey), ("expiration", encoded)]
      .map { (Data(SHA256.hash(data: Data($0.0.utf8))), Data(SHA256.hash(data: $0.1))) }
      .sorted { $0.0.lexicographicallyPrecedes($1.0) }
    let concatenated = fields.reduce(into: Data()) {
      $0.append($1.0)
      $0.append($1.1)
    }
    return Data([0x1a]) + Data("ic-request-auth-delegation".utf8)
      + Data(SHA256.hash(data: concatenated))
  }

  func verify(issuer: Data) throws {
    let message = try signingMessage()
    let ed25519Prefix = Data([
      0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00,
    ])
    let valid: Bool
    if issuer.count == 44, issuer.starts(with: ed25519Prefix) {
      let key = try Curve25519.Signing.PublicKey(rawRepresentation: issuer.dropFirst(12))
      valid = key.isValidSignature(signature, for: message)
    } else if let key = try? P256.Signing.PublicKey(derRepresentation: issuer),
      let signature = try? P256.Signing.ECDSASignature(rawRepresentation: signature)
    {
      valid = key.isValidSignature(signature, for: message)
    } else {
      throw AuthError.invalidResponse
    }
    guard valid else { throw AuthError.invalidResponse }
  }
}

enum AuthError: Error, LocalizedError {
  case invalidResponse, expired, randomGeneration, storage, signIn

  var errorDescription: String? {
    switch self {
    case .invalidResponse: String(localized: "auth.error.invalid_response")
    case .expired: String(localized: "auth.error.expired")
    case .randomGeneration, .signIn: String(localized: "auth.error.sign_in")
    case .storage: String(localized: "auth.error.storage")
    }
  }
}
