import CryptoKit
import Foundation

@testable import App

// Used only in the test target. This identity is never persisted or shown to public dapps.
func fixtureSession(key: Curve25519.Signing.PrivateKey, expiry: Date) throws -> AuthSession {
  let root = Curve25519.Signing.PrivateKey()
  let delegation = DelegationChain.SignedDelegation.Delegation(
    pubkey: Icrc167.derPublicKey(key),
    expiration: String(UInt64(expiry.timeIntervalSince1970 * 1_000_000_000)), targets: nil)
  let unsigned = DelegationChain.SignedDelegation(delegation: delegation, signature: Data())
  let signed = DelegationChain.SignedDelegation(
    delegation: delegation, signature: try root.signature(for: unsigned.signingMessage()))
  return AuthSession(
    privateKey: key.rawRepresentation,
    chain: .init(
      publicKey: Icrc167.derPublicKey(root), signerDelegation: [signed]))
}
