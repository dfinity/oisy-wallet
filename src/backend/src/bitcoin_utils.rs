use bitcoin::{Address, Network, PublicKey};
use ic_cdk::api::management_canister::bitcoin::BitcoinNetwork;

fn transform_network(network: BitcoinNetwork) -> Network {
    match network {
        BitcoinNetwork::Mainnet => Network::Bitcoin,
        BitcoinNetwork::Testnet => Network::Testnet,
        BitcoinNetwork::Regtest => Network::Regtest,
    }
}

/// Converts a public key to a P2PKH address.
/// Reference: [IC Bitcoin Documentation](https://internetcomputer.org/docs/current/developer-docs/multi-chain/bitcoin/using-btc/generate-addresses#generating-addresses-with-threshold-ecdsa)
pub fn public_key_to_p2pkh_address(network: BitcoinNetwork, public_key: &[u8]) -> String {
    Address::p2pkh(
        PublicKey::from_slice(public_key).expect("failed to parse public key"),
        transform_network(network),
    )
    .to_string()
}
