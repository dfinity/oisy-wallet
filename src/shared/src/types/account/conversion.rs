//! Conversion functions for account identifiers.
use std::str::FromStr;

use candid::{CandidType, Deserialize, Principal};
use serde::Serialize;

use super::{
    BtcAddress, EthAddress, IcrcSubaccountId, Icrcv2AccountId, SolPrincipal, TokenAccountId,
};

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

impl FromStr for IcrcSubaccountId {
    type Err = ParseError;

    fn from_str(_: &str) -> Result<Self, Self::Err> {
        todo!()
    }
}
