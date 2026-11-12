import Foundation
import IcpSdkCore

// Synthetic test keys only. The output contains public delegations, never keys.
private struct Input: Decodable {
  let publicKeyBase64: String
  let expiresAtMs: UInt64
}
@main
struct HandoffVector {
  static func main() throws {
    let bytes = FileHandle.standardInput.readDataToEndOfFile()
    guard bytes.count <= 2048 else { throw CocoaError(.coderInvalidValue) }
    let input = try JSONDecoder().decode(Input.self, from: bytes)
    guard let web = Data(base64Encoded: input.publicKeyBase64), !web.isEmpty,
      web.count <= 512, input.expiresAtMs < UInt64.max / 1_000_000
    else { throw CocoaError(.coderInvalidValue) }
    let root = try softwareKeyGenerate()
    let native = try softwareKeyGenerate()
    let target = try principalFromText(text: "rdmx6-jaaaa-aaaaa-aaadq-cai")
    func hop(from key: Data, to receiver: Data) throws -> SignedDelegation {
      let delegation = Delegation(pubkey: receiver,
        expirationNs: input.expiresAtMs * 1_000_000, targets: [target], permissions: nil)
      let signature = try softwareKeySign(secretBytes: key,
        payload: delegationSignable(delegation: delegation))
      return SignedDelegation(delegation: delegation, signature: signature)
    }
    let vector = try DelegationChain(publicKey: softwareKeyPublicDer(secretBytes: root),
      delegations: [hop(from: root, to: softwareKeyPublicDer(secretBytes: native)),
        hop(from: native, to: web)])
    FileHandle.standardOutput.write(try JSONEncoder().encode(DelegationJSON(vector)))
  }
}
