//! Conversion functions for account identifiers.
use std::{str::FromStr, string::ParseError};

use super::{BtcAddress, EthAddress, Icrcv2AccountId, SolPrincipal, TokenAccountId};

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

    fn from_str(_: &str) -> Result<Self, Self::Err> {
        todo!()
    }
}

impl FromStr for SolPrincipal {
    type Err = ParseError;

    fn from_str(_: &str) -> Result<Self, Self::Err> {
        todo!()
    }
}

impl FromStr for BtcAddress {
    type Err = ParseError;

    fn from_str(_: &str) -> Result<Self, Self::Err> {
        todo!()
    }
}

impl FromStr for EthAddress {
    type Err = ParseError;

    fn from_str(_: &str) -> Result<Self, Self::Err> {
        todo!()
    }
}
