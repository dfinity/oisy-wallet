//! Conversion functions for account identifiers.
use std::str::FromStr;

use candid::{CandidType, Deserialize, Principal};
use serde::Serialize;
use sha2::{Digest, Sha256};

use super::{
    BtcAddress, EthAddress, IcrcSubaccountId, Icrcv2AccountId, SolPrincipal, TokenAccountId,
};

#[cfg(test)]
mod tests;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, CandidType, Serialize, Deserialize, Default)]
pub enum ParseError {
    #[default]
    UnsupportedFormat,
    InvalidLength,
    InvalidPrefix,
    InvalidChecksum,
    InvalidEncoding,
}

impl FromStr for TokenAccountId {
    type Err = ParseError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        SolPrincipal::from_str(s)
            .map(TokenAccountId::Sol)
            .or_else(|_| BtcAddress::from_str(s).map(TokenAccountId::Btc))
            .or_else(|_| EthAddress::from_str(s).map(TokenAccountId::Eth))
            .or_else(|_| Icrcv2AccountId::from_str(s).map(TokenAccountId::Icrcv2))
            .map_err(|_| ParseError::UnsupportedFormat)
    }
}

impl From<SolPrincipal> for TokenAccountId {
    fn from(value: SolPrincipal) -> Self {
        TokenAccountId::Sol(value)
    }
}

impl From<BtcAddress> for TokenAccountId {
    fn from(value: BtcAddress) -> Self {
        TokenAccountId::Btc(value)
    }
}

impl From<EthAddress> for TokenAccountId {
    fn from(value: EthAddress) -> Self {
        TokenAccountId::Eth(value)
    }
}

impl From<Icrcv2AccountId> for TokenAccountId {
    fn from(value: Icrcv2AccountId) -> Self {
        TokenAccountId::Icrcv2(value)
    }
}

impl FromStr for Icrcv2AccountId {
    type Err = ParseError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        if s.contains('-') {
            Ok(Icrcv2AccountId::WithPrincipal {
                owner: Principal::from_text(s).map_err(|_| ParseError::InvalidEncoding)?,
                subaccount: None,
            })
        } else if s.len() == 64 {
            Ok(Icrcv2AccountId::Account(
                IcrcSubaccountId::from_str(s).map_err(|_| ParseError::InvalidEncoding)?,
            ))
        } else {
            Err(ParseError::UnsupportedFormat)
        }
    }
}

impl FromStr for SolPrincipal {
    type Err = ParseError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let bytes = bs58::decode(s)
            .into_vec()
            .map_err(|_| ParseError::InvalidEncoding)?;
        if bytes.len() == 32 {
            Ok(SolPrincipal(s.to_string()))
        } else {
            Err(ParseError::InvalidLength)
        }
    }
}

impl FromStr for EthAddress {
    type Err = ParseError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        if let Some(hex_encoded) = s.strip_prefix("0x") {
            if hex_encoded.len() != 40 {
                return Err(ParseError::InvalidLength);
            }
            let mut bytes = [0u8; 20];
            hex::decode_to_slice(hex_encoded, &mut bytes)
                .map_err(|_| ParseError::InvalidEncoding)?;
            Ok(EthAddress::Public(s.to_string()))
        } else {
            Err(ParseError::InvalidPrefix)
        }
    }
}

impl FromStr for IcrcSubaccountId {
    type Err = ParseError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        if s.len() == 64 {
            let mut bytes = [0u8; 32];
            hex::decode_to_slice(s, &mut bytes).map_err(|_| ParseError::InvalidEncoding)?;
            Ok(IcrcSubaccountId(bytes))
        } else {
            Err(ParseError::InvalidLength)
        }
    }
}

impl FromStr for BtcAddress {
    type Err = ParseError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Self::from_p2pkh(s)
            .or_else(|_| Self::from_p2sh(s))
            .or_else(|_| Self::from_p2wpkh(s))
            .or_else(|_| Self::from_p2wsh(s))
            .or_else(|_| Self::from_p2tr(s))
    }
}

impl BtcAddress {
    const MAINNET_PREFIX: &str = "bc";
    const TESTNET_PREFIX: &str = "tb";

    /// Removes the mainnet or testnet prefix from a Bitcoin address
    ///
    /// # Errors
    /// - If the address does not have either `MAINNET_PREFIX` or `TESTNET_PREFIX` as a prefix.
    fn strip_prefix(s: &str) -> Result<&str, ParseError> {
        s.strip_prefix(Self::MAINNET_PREFIX)
            .or_else(|| s.strip_prefix(Self::TESTNET_PREFIX))
            .ok_or(ParseError::InvalidPrefix)
    }

    /// Calculates the checksum for a Bitcoin address
    ///
    /// The hash: Hash twice with SHA256 and take the first 4 bytes.
    fn address_checksum(bytes: &[u8]) -> [u8; 4] {
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

    /// Parses a P2PKH Bitcoin address
    ///
    /// # Errors
    /// - If the address is not a valid P2PKH address.
    pub fn from_p2pkh(s: &str) -> Result<Self, ParseError> {
        if !(s.len() >= 27 && s.len() <= 34) {
            return Err(ParseError::InvalidLength);
        }
        let body = s; // No prefix to strip
        let bytes = bs58::decode(body)
            .into_vec()
            .map_err(|_| ParseError::InvalidChecksum)?;
        if bytes.len() != 25 {
            return Err(ParseError::InvalidLength);
        }
        if bytes[0] != 0x00 {
            return Err(ParseError::InvalidPrefix);
        }
        let checksum = &bytes[21..25];
        let expected_checksum = Self::address_checksum(&bytes[0..21]);
        if checksum != expected_checksum {
            return Err(ParseError::InvalidChecksum);
        }
        Ok(BtcAddress::P2PKH(s.to_string()))
    }

    /// Parses a P2SH Bitcoin address
    ///
    /// # Errors
    /// - If the address is not a valid P2SH address.
    pub fn from_p2sh(s: &str) -> Result<Self, ParseError> {
        let body = s; // No prefix to strip
        if !body.starts_with('3') {
            return Err(ParseError::InvalidPrefix);
        }
        if body.len() != 34 {
            return Err(ParseError::InvalidLength);
        }
        Ok(BtcAddress::P2SH(s.to_string()))
    }

    /// Parses a P2WPKH Bitcoin address
    ///
    /// # Errors
    /// - If the address is not a valid P2WPKH address.
    pub fn from_p2wpkh(s: &str) -> Result<Self, ParseError> {
        let body = Self::strip_prefix(s)?;
        if !body.starts_with('1') {
            return Err(ParseError::InvalidPrefix);
        }
        if s.len() != 42 {
            return Err(ParseError::InvalidLength);
        }
        Ok(BtcAddress::P2WPKH(s.to_string()))
    }

    /// Parses a P2WSH Bitcoin address
    ///
    /// # Errors
    /// - If the address is not a valid P2WSH address.
    pub fn from_p2wsh(s: &str) -> Result<Self, ParseError> {
        let body = Self::strip_prefix(s)?;
        if !body.starts_with("1q") {
            return Err(ParseError::InvalidPrefix);
        }
        if s.len() != 62 {
            return Err(ParseError::InvalidLength);
        }
        Ok(BtcAddress::P2WSH(s.to_string()))
    }

    /// Parses a P2TR Bitcoin address
    ///
    /// # Errors
    /// - If the address is not a valid P2TR address.
    pub fn from_p2tr(s: &str) -> Result<Self, ParseError> {
        let body = Self::strip_prefix(s)?;
        if !body.starts_with("1p") {
            return Err(ParseError::InvalidPrefix);
        }
        if s.len() != 62 {
            return Err(ParseError::InvalidLength);
        }
        Ok(BtcAddress::P2TR(s.to_string()))
    }
}
