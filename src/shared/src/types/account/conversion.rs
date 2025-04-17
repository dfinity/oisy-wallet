//! Conversion functions for account identifiers.
use std::str::FromStr;

use candid::{CandidType, Deserialize, Principal};
use serde::Serialize;

use super::{
    BtcAddress, EthAddress, IcrcSubaccountId, Icrcv2AccountId, SolPrincipal, TokenAccountId,
};
use sha2::{Sha256, Digest};

#[cfg(test)]
mod tests;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, CandidType, Serialize, Deserialize)]
pub struct ParseError();

impl FromStr for TokenAccountId {
    type Err = ParseError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        SolPrincipal::from_str(s)
            .map(TokenAccountId::Sol)
            .or_else(|_| BtcAddress::from_str(s).map(TokenAccountId::Btc))
            .or_else(|_| EthAddress::from_str(s).map(TokenAccountId::Eth))
            .or_else(|_| Icrcv2AccountId::from_str(s).map(TokenAccountId::Icrcv2))
    }
}

impl FromStr for Icrcv2AccountId {
    type Err = ParseError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        if s.contains('-') {
            Ok(Icrcv2AccountId::WithPrincipal {
                owner: Principal::from_text(s).map_err(|_| ParseError())?,
                subaccount: None,
            })
        } else if s.len() == 64 {
            Ok(Icrcv2AccountId::Account(
                IcrcSubaccountId::from_str(s).map_err(|_| ParseError())?,
            ))
        } else {
            Err(ParseError())
        }
    }
}

impl FromStr for SolPrincipal {
    type Err = ParseError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let bytes = bs58::decode(s).into_vec().map_err(|_| ParseError())?;
        if bytes.len() == 32 {
            Ok(SolPrincipal(s.to_string()))
        } else {
            Err(ParseError())
        }
    }
}

impl FromStr for EthAddress {
    type Err = ParseError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        if let Some(hex_encoded) = s.strip_prefix("0x") {
            let mut bytes = [0u8; 20];
            hex::decode_to_slice(hex_encoded, &mut bytes).map_err(|_| ParseError())?;
            Ok(EthAddress::Public(s.to_string()))
        } else {
            Err(ParseError())
        }
    }
}

impl FromStr for IcrcSubaccountId {
    type Err = ParseError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        if s.len() == 64 {
            let mut bytes = [0u8; 32];
            hex::decode_to_slice(s, &mut bytes).map_err(|_| ParseError())?;
            Ok(IcrcSubaccountId(bytes))
        } else {
            Err(ParseError())
        }
    }
}

impl FromStr for BtcAddress {
    type Err = ParseError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Self::from_p2pkh(s).or_else(|_| Self::from_p2sh(s))
    }
}

impl BtcAddress {
    /*
    const MAINNET_PREFIX: &str = "bc";
    const TESTNET_PREFIX: &str = "tb";

    /// Removes the mainnet or testnet prefix from a Bitcoin address
    fn strip_prefix(s: &str) -> Result<&str, ParseError> {
        s.strip_prefix(Self::MAINNET_PREFIX)
            .or_else(|| s.strip_prefix(Self::TESTNET_PREFIX))
            .ok_or(ParseError())
    }
    */
    fn address_checksum(bytes: &[u8]) -> [u8;4] {
        let hash = {
            let mut hasher = Sha256::new();
            hasher.update(bytes);
            let ans = hasher.finalize_reset();
            hasher.update(ans);
            hasher.finalize()
        };
        let mut checksum = [0u8; 4];
        checksum.copy_from_slice(&hash[0..4]);
        checksum
    }
    pub fn from_p2pkh(s: &str) -> Result<Self, ParseError> {
        if !(s.len() >= 27 && s.len() <= 34) {
            panic!("Invalid P2PKH address length: {}", s.len());
            //return Err(ParseError());
        }
        let body = s; // No prefix to strip
        let bytes = bs58::decode(body).into_vec().map_err(|_| ParseError())?;
        if bytes.len() != 25 {
            return Err(ParseError());
        }
        if bytes[0] != 0x00 {
            return Err(ParseError());
        }
        let checksum = &bytes[21..25];
        let expected_checksum = Self::address_checksum(&bytes[0..21]);
        if checksum != expected_checksum {
            return Err(ParseError());
        }
        Ok(BtcAddress::P2PKH(s.to_string()))
    }
    pub fn from_p2sh(s: &str) -> Result<Self, ParseError> {
        let body = s; // No prefix to strip
        if !body.starts_with("3") {
            return Err(ParseError());
        }
        if body.len() != 34 {
            return Err(ParseError());
        }
        Ok(BtcAddress::P2SH(s.to_string()))
    }
}
