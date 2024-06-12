use std::str::FromStr;
use ic_cdk::api::management_canister::bitcoin::{BitcoinNetwork};
use k256::sha2;
use k256::sha2::Digest;

fn parse_derivation_path(path: &str) -> Vec<Vec<u8>> {
    let re = regex::Regex::new(r"^m/44'(/\d+'?){2}/[01]/\d+$").unwrap();
    assert!(re.is_match(path), "Invalid BIP-44 derivation path format");

    path.split('/')
        .skip(1) // Skip the leading 'm'
        .map(|s| {
            if s.ends_with('\'') {
                // Handle hardened derivation (apostrophe indicates hardened)
                // Value 0x80000000 is added to represent a hardened key.
                // It is the hexadecimal of the smallest 32-bit value with the high-order bit set
                // More details: https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki#Extended_keys
                let index = u32::from_str(&s[..s.len() - 1]).unwrap() + 0x80000000;
                index.to_be_bytes().to_vec()
            } else {
                let index = u32::from_str(s).unwrap();
                index.to_be_bytes().to_vec()
            }
        })
        .collect()
}

pub fn network_to_derivation_path(network: BitcoinNetwork) -> Vec<Vec<u8>> {
    // This is a simplified version of the complete flow to create a derivation path.
    // The documentation on the complete flow can be found at https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki
    // For the current implementation and to spare computation workload, we are using the default account 0, change 0, and address index 0.
    // For the Regtest network, we are using the Testnet derivation path, even if it is not necessary to conform to BIP-44, since it is a local node.
    // However, we do that because we would like to have the same behavior of the Testnet network.
    let coin_type = match network {
        BitcoinNetwork::Mainnet => "0",
        BitcoinNetwork::Testnet => "1",
        BitcoinNetwork::Regtest => "1",
    };
    let path = format!("m/44'/{}'/0'/0/0", coin_type);
    parse_derivation_path(&path)
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

// Converts a public key to a P2PKH address.
pub fn public_key_to_p2pkh_address(public_key: &[u8], network: BitcoinNetwork) -> String {
    // SHA-256 & RIPEMD-160
    let result = ripemd160(&sha256(public_key));

    let prefix = match network {
        BitcoinNetwork::Testnet | BitcoinNetwork::Regtest => 0x6f,
        BitcoinNetwork::Mainnet => 0x00,
    };
    let mut data_with_prefix = vec![prefix];
    data_with_prefix.extend(result);

    let checksum = &sha256(&sha256(&data_with_prefix.clone()))[..4];

    let mut full_address = data_with_prefix;
    full_address.extend(checksum);

    bs58::encode(full_address).into_string()
}