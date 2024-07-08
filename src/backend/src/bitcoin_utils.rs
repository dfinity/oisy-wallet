use std::str::FromStr;
use ic_cdk::api::management_canister::bitcoin::{BitcoinNetwork};
use k256::sha2;
use k256::sha2::Digest;

struct DerivationPath {
    account: u32,
    change: u32,
    address_index: u32,
}

impl FromStr for DerivationPath {
    type Err = String;

    fn from_str(path: &str) -> Result<Self, Self::Err> {
        let re = regex::Regex::new(r"^m/44'(/\d+'?){2}/[01]/\d+$").unwrap();
        if !re.is_match(path) {
            return Err("Invalid BIP-44 derivation path format".into());
        }

        let segments: Vec<&str> = path.split('/').skip(1).collect();
        let account = parse_segment(segments[1])?;
        let change = parse_segment(segments[2])?;
        let address_index = segments[3].parse::<u32>().map_err(|e| e.to_string())?;

        Ok(DerivationPath {
            account,
            change,
            address_index,
        })
    }
}

impl Into<Vec<Vec<u8>>> for DerivationPath {
    fn into(self) -> Vec<Vec<u8>> {
        vec![
            self.account.to_be_bytes().to_vec(),
            self.change.to_be_bytes().to_vec(),
            self.address_index.to_be_bytes().to_vec(),
        ]
    }
}

fn parse_segment(segment: &str) -> Result<u32, String> {
    if let Some(stripped) = segment.strip_suffix('\'') {
        let index = stripped.parse::<u32>().map_err(|e| e.to_string())? + 0x8000_0000;
        Ok(index)
    } else {
        segment.parse::<u32>().map_err(|e| e.to_string())
    }
}

pub fn network_to_derivation_path(network: BitcoinNetwork) -> Vec<Vec<u8>> {
    let coin_type = match network {
        BitcoinNetwork::Mainnet => "0",
        BitcoinNetwork::Testnet | BitcoinNetwork::Regtest => "1",
    };
    let path = format!("m/44'/{coin_type}'/0'/0/0");
    let derivation_path: DerivationPath = path.parse().expect("Invalid derivation path");
    derivation_path.into()
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
        hasher.update(&[prefix]);
        hasher.update(&result);
        let hash_result = hasher.finalize().to_vec();
        sha2::Sha256::digest(&hash_result)[..4].to_vec()
    };

    let mut full_address = vec![prefix];
    full_address.extend(&result);
    full_address.extend(checksum);

    bs58::encode(full_address).into_string()
}