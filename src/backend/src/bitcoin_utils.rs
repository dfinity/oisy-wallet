use std::str::FromStr;
use ic_cdk::api::management_canister::bitcoin::{BitcoinNetwork};

fn parse_derivation_path(path: &str) -> Vec<Vec<u8>> {
    let re = regex::Regex::new(r"^m/44'(/\d+'?){2}/[01]/\d+$").unwrap();
    assert!(re.is_match(path), "Invalid BIP-44 derivation path format");

    path.split('/')
        .skip(1) // Skip the leading 'm'
        .map(|s| {
            if s.ends_with('\'') {
                // Handle hardened derivation (apostrophe indicates hardened)
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
    let coin_type = match network {
        BitcoinNetwork::Mainnet => "0",
        BitcoinNetwork::Testnet => "1",
        BitcoinNetwork::Regtest => "1",
    };
    let path = format!("m/44'/{}'/0'/0/0", coin_type);
    parse_derivation_path(&path)
}
