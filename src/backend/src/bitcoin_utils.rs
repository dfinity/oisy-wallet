use derivation_path::DerivationPath;
use ic_cdk::api::management_canister::bitcoin::BitcoinNetwork;
use k256::sha2;
use k256::sha2::Digest;

/// Gets the derivation path for a given Bitcoin network
///
/// This is a simplified version of the complete flow to create a derivation path.
/// The documentation on the complete flow can be found at <https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki>
/// For the current implementation and to spare computation workload, we are using the default account 0, change 0, and address index 0.
/// For the Regtest network, we are using the Testnet derivation path, even if it is not necessary to conform to BIP-44, since it is a local node.
/// However, we do that because we would like to have the same behavior of the Testnet network.
///
/// To help with the implementation, we are using the `derivation_path` crate.
/// <https://crates.io/crates/derivation-path>
pub fn network_to_derivation_path(network: BitcoinNetwork) -> Vec<Vec<u8>> {
    let coin_type = match network {
        BitcoinNetwork::Mainnet => 0,
        BitcoinNetwork::Testnet | BitcoinNetwork::Regtest => 1,
    };

    DerivationPath::bip44(coin_type, 0, 0, 0)
        .unwrap()
        .into_iter()
        .map(|index| index.to_bits().to_be_bytes().to_vec())
        .collect()
}

fn sha256(data: &[u8]) -> Vec<u8> {
    let mut hasher = sha2::Sha256::new();
    hasher.update(data);
    hasher.finalize().to_vec()
}

fn ripemd160(data: &[u8]) -> Vec<u8> {
    let mut hasher = ripemd::Ripemd160::new();
    hasher.update(data);
    hasher.finalize().to_vec()
}

/// Converts a public key to a P2PKH address.
pub fn public_key_to_p2pkh_address(public_key: &[u8], network: BitcoinNetwork) -> String {
    // SHA-256 & RIPEMD-160
    let result = ripemd160(&sha256(public_key));

    let prefix = match network {
        BitcoinNetwork::Testnet | BitcoinNetwork::Regtest => 0x6f,
        BitcoinNetwork::Mainnet => 0x00,
    };

    let checksum = {
        let mut hasher = sha2::Sha256::new();
        hasher.update([prefix]);
        hasher.update(&result);
        let hash_result = hasher.finalize().to_vec();
        sha2::Sha256::digest(hash_result)[..4].to_vec()
    };

    let mut full_address = vec![prefix];
    full_address.extend(&result);
    full_address.extend(checksum);

    bs58::encode(full_address).into_string()
}
