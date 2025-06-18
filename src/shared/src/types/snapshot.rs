//! A moment-in-time summary of an account.

#[cfg(test)]
use candid::Principal;
use candid::{CandidType, Deserialize};
use serde::Serialize;

use crate::types::{
    account::{AccountId, BtcAddress, EthAddress, Icrcv2AccountId, SolPrincipal},
    network::marker_trait::{
        BitcoinMainnet, BitcoinRegtest, BitcoinTestnet, EthereumMainnet, EthereumSepolia,
        InternetComputer, Network, SolanaDevnet, SolanaLocal, SolanaMainnet,
    },
    number::ComparableFloat,
    token_id::{BtcTokenId, EthTokenId, IcrcTokenId, SolTokenId, TokenId},
    transaction::Transaction,
};
/// Snapshot of an account.
///
/// # Generic Parameters
/// - `N`: `Network`
/// - `A`: `AccountId`
/// - `T`: `TokenAddress`
#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct AccountSnapshot<N, A, T>
where
    N: Network,
    A: AccountId<N>,
    T: TokenId<N>,
{
    pub timestamp: u64,
    pub network: N,
    pub token_address: T,
    pub account: A,
    pub decimals: u8,
    pub approx_usd_per_token: ComparableFloat,
    pub amount: u64,
    pub last_transactions: Vec<Transaction<N, A>>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Eq, PartialEq)]
pub enum AccountSnapshotFor {
    Icrcv2(AccountSnapshot<InternetComputer, Icrcv2AccountId, IcrcTokenId>),
    SolDevnet(AccountSnapshot<SolanaDevnet, SolPrincipal, SolTokenId>),
    SolMainnet(AccountSnapshot<SolanaMainnet, SolPrincipal, SolTokenId>),
    SolLocal(AccountSnapshot<SolanaLocal, SolPrincipal, SolTokenId>),
    SplMainnet(AccountSnapshot<SolanaMainnet, SolPrincipal, SolTokenId>),
    SplDevnet(AccountSnapshot<SolanaDevnet, SolPrincipal, SolTokenId>),
    SplLocal(AccountSnapshot<SolanaLocal, SolPrincipal, SolTokenId>),
    BtcMainnet(AccountSnapshot<BitcoinMainnet, BtcAddress, BtcTokenId>),
    BtcTestnet(AccountSnapshot<BitcoinTestnet, BtcAddress, BtcTokenId>),
    BtcRegtest(AccountSnapshot<BitcoinRegtest, BtcAddress, BtcTokenId>),
    EthMainnet(AccountSnapshot<EthereumMainnet, EthAddress, EthTokenId>),
    EthSepolia(AccountSnapshot<EthereumSepolia, EthAddress, EthTokenId>),
    Erc20Mainnet(AccountSnapshot<EthereumMainnet, EthAddress, EthTokenId>),
    Erc20Sepolia(AccountSnapshot<EthereumSepolia, EthAddress, EthTokenId>),
}

// Accessors for fields common to all variants:
impl AccountSnapshotFor {
    #[must_use]
    pub fn timestamp(&self) -> u64 {
        match self {
            AccountSnapshotFor::Icrcv2(snapshot) => snapshot.timestamp,
            AccountSnapshotFor::SolDevnet(snapshot) | AccountSnapshotFor::SplDevnet(snapshot) => {
                snapshot.timestamp
            }
            AccountSnapshotFor::SolMainnet(snapshot) | AccountSnapshotFor::SplMainnet(snapshot) => {
                snapshot.timestamp
            }
            AccountSnapshotFor::SolLocal(snapshot) | AccountSnapshotFor::SplLocal(snapshot) => {
                snapshot.timestamp
            }
            AccountSnapshotFor::BtcMainnet(snapshot) => snapshot.timestamp,
            AccountSnapshotFor::BtcTestnet(snapshot) => snapshot.timestamp,
            AccountSnapshotFor::BtcRegtest(snapshot) => snapshot.timestamp,
            AccountSnapshotFor::EthMainnet(snapshot)
            | AccountSnapshotFor::Erc20Mainnet(snapshot) => snapshot.timestamp,
            AccountSnapshotFor::EthSepolia(snapshot)
            | AccountSnapshotFor::Erc20Sepolia(snapshot) => snapshot.timestamp,
        }
    }

    #[must_use]
    pub fn decimals(&self) -> u8 {
        match self {
            AccountSnapshotFor::Icrcv2(snapshot) => snapshot.decimals,
            AccountSnapshotFor::SolDevnet(snapshot) | AccountSnapshotFor::SplDevnet(snapshot) => {
                snapshot.decimals
            }
            AccountSnapshotFor::SolMainnet(snapshot) | AccountSnapshotFor::SplMainnet(snapshot) => {
                snapshot.decimals
            }
            AccountSnapshotFor::SolLocal(snapshot) | AccountSnapshotFor::SplLocal(snapshot) => {
                snapshot.decimals
            }
            AccountSnapshotFor::BtcMainnet(snapshot) => snapshot.decimals,
            AccountSnapshotFor::BtcTestnet(snapshot) => snapshot.decimals,
            AccountSnapshotFor::BtcRegtest(snapshot) => snapshot.decimals,
            AccountSnapshotFor::EthMainnet(snapshot)
            | AccountSnapshotFor::Erc20Mainnet(snapshot) => snapshot.decimals,
            AccountSnapshotFor::EthSepolia(snapshot)
            | AccountSnapshotFor::Erc20Sepolia(snapshot) => snapshot.decimals,
        }
    }

    #[must_use]
    pub fn approx_usd_per_token(&self) -> ComparableFloat {
        match self {
            AccountSnapshotFor::Icrcv2(snapshot) => snapshot.approx_usd_per_token,
            AccountSnapshotFor::SolDevnet(snapshot) | AccountSnapshotFor::SplDevnet(snapshot) => {
                snapshot.approx_usd_per_token
            }
            AccountSnapshotFor::SolMainnet(snapshot) | AccountSnapshotFor::SplMainnet(snapshot) => {
                snapshot.approx_usd_per_token
            }
            AccountSnapshotFor::SolLocal(snapshot) | AccountSnapshotFor::SplLocal(snapshot) => {
                snapshot.approx_usd_per_token
            }
            AccountSnapshotFor::BtcMainnet(snapshot) => snapshot.approx_usd_per_token,
            AccountSnapshotFor::BtcTestnet(snapshot) => snapshot.approx_usd_per_token,
            AccountSnapshotFor::BtcRegtest(snapshot) => snapshot.approx_usd_per_token,
            AccountSnapshotFor::EthMainnet(snapshot)
            | AccountSnapshotFor::Erc20Mainnet(snapshot) => snapshot.approx_usd_per_token,
            AccountSnapshotFor::EthSepolia(snapshot)
            | AccountSnapshotFor::Erc20Sepolia(snapshot) => snapshot.approx_usd_per_token,
        }
    }

    #[must_use]
    pub fn amount(&self) -> u64 {
        match self {
            AccountSnapshotFor::Icrcv2(snapshot) => snapshot.amount,
            AccountSnapshotFor::SolDevnet(snapshot) | AccountSnapshotFor::SplDevnet(snapshot) => {
                snapshot.amount
            }
            AccountSnapshotFor::SolMainnet(snapshot) | AccountSnapshotFor::SplMainnet(snapshot) => {
                snapshot.amount
            }
            AccountSnapshotFor::SolLocal(snapshot) | AccountSnapshotFor::SplLocal(snapshot) => {
                snapshot.amount
            }
            AccountSnapshotFor::BtcMainnet(snapshot) => snapshot.amount,
            AccountSnapshotFor::BtcTestnet(snapshot) => snapshot.amount,
            AccountSnapshotFor::BtcRegtest(snapshot) => snapshot.amount,
            AccountSnapshotFor::EthMainnet(snapshot)
            | AccountSnapshotFor::Erc20Mainnet(snapshot) => snapshot.amount,
            AccountSnapshotFor::EthSepolia(snapshot)
            | AccountSnapshotFor::Erc20Sepolia(snapshot) => snapshot.amount,
        }
    }
}

impl AccountSnapshotFor {
    #[must_use]
    #[allow(clippy::cast_precision_loss)]
    pub fn approx_usd_valuation(&self) -> f64 {
        self.approx_usd_per_token().value() * (self.amount() as f64)
            / 10_f64.powf(f64::from(self.decimals()))
    }

    #[must_use]
    pub fn last_transaction_timestamps(&self) -> Vec<u64> {
        match self {
            AccountSnapshotFor::Icrcv2(snapshot) => snapshot
                .last_transactions
                .iter()
                .map(|t| t.timestamp)
                .collect(),
            AccountSnapshotFor::SolDevnet(snapshot) => snapshot
                .last_transactions
                .iter()
                .map(|t| t.timestamp)
                .collect(),
            AccountSnapshotFor::SolMainnet(snapshot) => snapshot
                .last_transactions
                .iter()
                .map(|t| t.timestamp)
                .collect(),
            AccountSnapshotFor::SolLocal(snapshot) => snapshot
                .last_transactions
                .iter()
                .map(|t| t.timestamp)
                .collect(),
            AccountSnapshotFor::SplMainnet(snapshot) => snapshot
                .last_transactions
                .iter()
                .map(|t| t.timestamp)
                .collect(),
            AccountSnapshotFor::SplDevnet(snapshot) => snapshot
                .last_transactions
                .iter()
                .map(|t| t.timestamp)
                .collect(),
            AccountSnapshotFor::SplLocal(snapshot) => snapshot
                .last_transactions
                .iter()
                .map(|t| t.timestamp)
                .collect(),
            AccountSnapshotFor::BtcMainnet(snapshot) => snapshot
                .last_transactions
                .iter()
                .map(|t| t.timestamp)
                .collect(),
            AccountSnapshotFor::BtcTestnet(snapshot) => snapshot
                .last_transactions
                .iter()
                .map(|t| t.timestamp)
                .collect(),
            AccountSnapshotFor::BtcRegtest(snapshot) => snapshot
                .last_transactions
                .iter()
                .map(|t| t.timestamp)
                .collect(),
            AccountSnapshotFor::EthMainnet(snapshot) => snapshot
                .last_transactions
                .iter()
                .map(|t| t.timestamp)
                .collect(),
            AccountSnapshotFor::EthSepolia(snapshot) => snapshot
                .last_transactions
                .iter()
                .map(|t| t.timestamp)
                .collect(),
            AccountSnapshotFor::Erc20Mainnet(snapshot) => snapshot
                .last_transactions
                .iter()
                .map(|t| t.timestamp)
                .collect(),
            AccountSnapshotFor::Erc20Sepolia(snapshot) => snapshot
                .last_transactions
                .iter()
                .map(|t| t.timestamp)
                .collect(),
        }
    }
}

#[test]
fn can_calculate_approx_usd_valuation() {
    let snapshot = AccountSnapshotFor::Icrcv2(AccountSnapshot {
        timestamp: 1_712_345_678,
        network: InternetComputer {},
        token_address: IcrcTokenId::Native,
        account: Icrcv2AccountId::WithPrincipal {
            owner: Principal::from_text("aaaaa-aa").unwrap(),
            subaccount: None,
        },
        decimals: 6,
        approx_usd_per_token: ComparableFloat(10.99),
        amount: 1_000_000,
        last_transactions: vec![],
    });
    assert_eq!(
        ComparableFloat(snapshot.approx_usd_valuation()),
        ComparableFloat(10.99)
    );
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct UserSnapshot {
    pub timestamp: Option<u64>,
    pub accounts: Vec<AccountSnapshotFor>,
}
