use candid::{CandidType, Deserialize, Nat};
use serde::Serialize;

use super::account::AccountId;
use crate::types::network::marker_trait::Network;

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Eq, PartialEq)]
#[repr(u8)]
pub enum TransactionType {
    Send = 0,
    Receive = 1,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct Transaction<N, A>
where
    A: AccountId<N>,
    N: Network,
{
    pub network: N,
    pub transaction_type: TransactionType,
    pub amount: u64,
    pub timestamp: u64,
    pub counterparty: A,
}

#[derive(CandidType, Deserialize)]
pub struct SignRequest {
    pub chain_id: Nat,
    pub to: String,
    pub gas: Nat,
    pub max_fee_per_gas: Nat,
    pub max_priority_fee_per_gas: Nat,
    pub value: Nat,
    pub nonce: Nat,
    pub data: Option<String>,
}
