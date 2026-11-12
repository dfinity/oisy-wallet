import Foundation
import IcpSdkCore

// The public JSON shape consumed by the JS SDK's DelegationChain.fromJSON.
struct DelegationJSON: Encodable {
  struct Body: Encodable {
    let pubkey: String
    let expiration: String
    let targets: [String]?
    let permissions: String?
  }
  struct Hop: Encodable {
    let delegation: Body
    let signature: String
  }
  let publicKey: String
  let delegations: [Hop]

  init(_ chain: DelegationChain) {
    func hex(_ data: Data) -> String { data.map { String(format: "%02x", $0) }.joined() }
    publicKey = hex(chain.publicKey)
    delegations = chain.delegations.map { link in
      let permission: String?
      switch link.delegation.permissions {
      case .all: permission = "all"
      case .queries: permission = "queries"
      case nil: permission = nil
      }
      return Hop(delegation: Body(pubkey: hex(link.delegation.pubkey),
        expiration: String(link.delegation.expirationNs, radix: 16),
        targets: link.delegation.targets?.map(hex), permissions: permission),
        signature: hex(link.signature))
    }
  }
}
