//! A moment-in-time summary of an account.

use candid::{CandidType, Deserialize, Principal};
use serde::Serialize;

use crate::types::{
    account::{AccountId, BtcAddress, EthAddress, Icrcv2AccountId, SolPrincipal},
    network::marker_trait::{
        BitcoinMainnet, BitcoinRegtest, BitcoinTestnet, EthereumMainnet, EthereumSepolia,
        InternetComputer, Network, SolanaDevnet, SolanaLocal, SolanaMainnet, SolanaTestnet,
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
    SolTestnet(AccountSnapshot<SolanaTestnet, SolPrincipal, SolTokenId>),
    SolLocal(AccountSnapshot<SolanaLocal, SolPrincipal, SolTokenId>),
    SplMainnet(AccountSnapshot<SolanaMainnet, SolPrincipal, SolTokenId>),
    SplDevnet(AccountSnapshot<SolanaDevnet, SolPrincipal, SolTokenId>),
    SplTestnet(AccountSnapshot<SolanaTestnet, SolPrincipal, SolTokenId>),
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
    pub fn timestamp(&self) -> u64 {
        match self {
            AccountSnapshotFor::Icrcv2(snapshot)
            | AccountSnapshotFor::SolDevnet(snapshot)
            | AccountSnapshotFor::SolMainnet(snapshot)
            | AccountSnapshotFor::SolTestnet(snapshot)
            | AccountSnapshotFor::SolLocal(snapshot)
            | AccountSnapshotFor::SplMainnet(snapshot)
            | AccountSnapshotFor::SplDevnet(snapshot)
            | AccountSnapshotFor::SplTestnet(snapshot)
            | AccountSnapshotFor::SplLocal(snapshot)
            | AccountSnapshotFor::BtcMainnet(snapshot)
            | AccountSnapshotFor::BtcTestnet(snapshot)
            | AccountSnapshotFor::BtcRegtest(snapshot)
            | AccountSnapshotFor::EthMainnet(snapshot)
            | AccountSnapshotFor::EthSepolia(snapshot)
            | AccountSnapshotFor::Erc20Mainnet(snapshot)
            | AccountSnapshotFor::Erc20Sepolia(snapshot) => snapshot.timestamp,
        }
    }

    pub fn decimals(&self) -> u8 {
        match self {
            AccountSnapshotFor::Icrcv2(snapshot)
            | AccountSnapshotFor::SolDevnet(snapshot)
            | AccountSnapshotFor::SolMainnet(snapshot)
            | AccountSnapshotFor::SolTestnet(snapshot)
            | AccountSnapshotFor::SolLocal(snapshot)
            | AccountSnapshotFor::SplMainnet(snapshot)
            | AccountSnapshotFor::SplDevnet(snapshot)
            | AccountSnapshotFor::SplTestnet(snapshot)
            | AccountSnapshotFor::SplLocal(snapshot)
            | AccountSnapshotFor::BtcMainnet(snapshot)
            | AccountSnapshotFor::BtcTestnet(snapshot)
            | AccountSnapshotFor::BtcRegtest(snapshot)
            | AccountSnapshotFor::EthMainnet(snapshot)
            | AccountSnapshotFor::EthSepolia(snapshot)
            | AccountSnapshotFor::Erc20Mainnet(snapshot)
            | AccountSnapshotFor::Erc20Sepolia(snapshot) => snapshot.decimals,
        }
    }

    pub fn approx_usd_per_token(&self) -> ComparableFloat {
        match self {
            AccountSnapshotFor::Icrcv2(snapshot)
            | AccountSnapshotFor::SolDevnet(snapshot)
            | AccountSnapshotFor::SolMainnet(snapshot)
            | AccountSnapshotFor::SolTestnet(snapshot)
            | AccountSnapshotFor::SolLocal(snapshot)
            | AccountSnapshotFor::SplMainnet(snapshot)
            | AccountSnapshotFor::SplDevnet(snapshot)
            | AccountSnapshotFor::SplTestnet(snapshot)
            | AccountSnapshotFor::SplLocal(snapshot)
            | AccountSnapshotFor::BtcMainnet(snapshot)
            | AccountSnapshotFor::BtcTestnet(snapshot)
            | AccountSnapshotFor::BtcRegtest(snapshot)
            | AccountSnapshotFor::EthMainnet(snapshot)
            | AccountSnapshotFor::EthSepolia(snapshot)
            | AccountSnapshotFor::Erc20Mainnet(snapshot)
            | AccountSnapshotFor::Erc20Sepolia(snapshot) => snapshot.approx_usd_per_token,
        }
    }

    pub fn amount(&self) -> u64 {
        match self {
            AccountSnapshotFor::Icrcv2(snapshot)
            | AccountSnapshotFor::SolDevnet(snapshot)
            | AccountSnapshotFor::SolMainnet(snapshot)
            | AccountSnapshotFor::SolTestnet(snapshot)
            | AccountSnapshotFor::SolLocal(snapshot)
            | AccountSnapshotFor::SplMainnet(snapshot)
            | AccountSnapshotFor::SplDevnet(snapshot)
            | AccountSnapshotFor::SplTestnet(snapshot)
            | AccountSnapshotFor::SplLocal(snapshot)
            | AccountSnapshotFor::BtcMainnet(snapshot)
            | AccountSnapshotFor::BtcTestnet(snapshot)
            | AccountSnapshotFor::BtcRegtest(snapshot)
            | AccountSnapshotFor::EthMainnet(snapshot)
            | AccountSnapshotFor::EthSepolia(snapshot)
            | AccountSnapshotFor::Erc20Mainnet(snapshot)
            | AccountSnapshotFor::Erc20Sepolia(snapshot) => snapshot.amount,
        }
    }
}

impl AccountSnapshotFor {
    pub fn approx_usd_valuation(&self) -> f64 {
        self.approx_usd_per_token().value() * (self.amount() as f64)
            / 10_f64.powf(f64::from(self.decimals()))
    }

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
            AccountSnapshotFor::SolTestnet(snapshot) => snapshot
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
            AccountSnapshotFor::SplTestnet(snapshot) => snapshot
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
    let snapshot = AccountSnapshotFor::Icrc(AccountSnapshot {
        timestamp: 1712345678,
        network: Icrc {},
        token_address: Principal::from_text("aaaaa-aa").unwrap(),
        account: IcrcAccountId(Principal::from_text("aaaaa-aa").unwrap()),
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
