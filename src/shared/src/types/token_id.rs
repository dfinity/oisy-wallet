use candid::{CandidType, Deserialize, Principal};
use serde::Serialize;

use super::{
	account::{EthAddress, SolPrincipal},
	network::marker_trait::{BitcoinMainnet, BitcoinRegtest, BitcoinTestnet, InternetComputer},
};
use crate::types::network::marker_trait::Network;

/// A marker trait, used to indicate that a type can be used a token identifier for a given network.
pub trait TokenId<T>
where
    T: Network,
{
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Eq, PartialEq)]
pub enum BtcTokenId {
    Native,
}
impl TokenId<BitcoinMainnet> for BtcTokenId {}
impl TokenId<BitcoinTestnet> for BtcTokenId {}
impl TokenId<BitcoinRegtest> for BtcTokenId {}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Eq, PartialEq)]
pub enum IcrcTokenId {
    Native,
    Icrc {
        ledger: Principal,
        index: Option<Principal>,
    },
}
impl TokenId<InternetComputer> for IcrcTokenId {}

pub type SolTokenId = SolPrincipal;

pub type EthTokenId = EthAddress;
