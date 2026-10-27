import CryptoKit
import Foundation

// Only the bundled, origin-checked preview receives this short-lived child delegation.
// The native private key never leaves Keychain/the native process.
struct WebDelegation: Encodable {
  let id: String
  let principal: String
  let expiresAt: Double
  let chain: DelegationChain

  init(session: AuthSession, publicKey: Data, now: Date = .now) throws {
    try session.validate(now: now)
    let prefix = Data([0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00])
    guard publicKey.count == 44, publicKey.starts(with: prefix),
      publicKey != session.chain.publicKey,
      !session.chain.signerDelegation.contains(where: { $0.delegation.pubkey == publicKey })
    else {
      throw AuthError.invalidResponse
    }
    let expiry = min(session.expiresAt, now.addingTimeInterval(300))
    let delegation = DelegationChain.SignedDelegation.Delegation(
      pubkey: publicKey,
      expiration: String(UInt64(expiry.timeIntervalSince1970 * 1_000_000_000)), targets: nil)
    let unsigned = DelegationChain.SignedDelegation(delegation: delegation, signature: Data())
    let key = try Curve25519.Signing.PrivateKey(rawRepresentation: session.privateKey)
    let signed = DelegationChain.SignedDelegation(
      delegation: delegation, signature: try key.signature(for: unsigned.signingMessage()))
    id = UUID().uuidString
    principal = session.principal
    expiresAt = expiry.timeIntervalSince1970 * 1_000
    chain = DelegationChain(
      publicKey: session.chain.publicKey,
      signerDelegation: session.chain.signerDelegation + [signed])
  }
}
