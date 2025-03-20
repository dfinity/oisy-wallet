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
    Icrcv2(AccountSnapshot<InternetComputer, Icrcv2AccountId, Principal>),
    SolDevnet(AccountSnapshot<SolanaDevnet, SolPrincipal, Principal>),
    SolMainnet(AccountSnapshot<SolanaMainnet, SolPrincipal, Principal>),
    SolTestnet(AccountSnapshot<SolanaTestnet, SolPrincipal, Principal>),
    SolLocal(AccountSnapshot<SolanaLocal, SolPrincipal, Principal>),
    SplMainnet(AccountSnapshot<SolanaMainnet, SolPrincipal, SolPrincipal>),
    SplDevnet(AccountSnapshot<SolanaDevnet, SolPrincipal, SolPrincipal>),
    SplTestnet(AccountSnapshot<SolanaTestnet, SolPrincipal, SolPrincipal>),
    SplLocal(AccountSnapshot<SolanaLocal, SolPrincipal, SolPrincipal>),
    BtcMainnet(AccountSnapshot<BitcoinMainnet, BtcAddress, Principal>),
    BtcTestnet(AccountSnapshot<BitcoinTestnet, BtcAddress, Principal>),
    BtcRegtest(AccountSnapshot<BitcoinRegtest, BtcAddress, Principal>),
    EthMainnet(AccountSnapshot<EthereumMainnet, EthAddress, Principal>),
    EthSepolia(AccountSnapshot<EthereumSepolia, EthAddress, Principal>),
    Erc20Mainnet(AccountSnapshot<EthereumMainnet, EthAddress, Principal>),
    Erc20Sepolia(AccountSnapshot<EthereumSepolia, EthAddress, Principal>),
}

// Accessors for fields common to all variants:
impl AccountSnapshotFor {
    pub fn timestamp(&self) -> u64 {
        match self {
            AccountSnapshotFor::Icrcv2(snapshot) => snapshot.timestamp,
            AccountSnapshotFor::SolDevnet(snapshot) => snapshot.timestamp,
            AccountSnapshotFor::SolMainnet(snapshot) => snapshot.timestamp,
            AccountSnapshotFor::SolTestnet(snapshot) => snapshot.timestamp,
            AccountSnapshotFor::SolLocal(snapshot) => snapshot.timestamp,
            AccountSnapshotFor::SplMainnet(snapshot) => snapshot.timestamp,
            AccountSnapshotFor::SplDevnet(snapshot) => snapshot.timestamp,
            AccountSnapshotFor::SplTestnet(snapshot) => snapshot.timestamp,
            AccountSnapshotFor::SplLocal(snapshot) => snapshot.timestamp,
            AccountSnapshotFor::BtcMainnet(snapshot) => snapshot.timestamp,
            AccountSnapshotFor::BtcTestnet(snapshot) => snapshot.timestamp,
            AccountSnapshotFor::BtcRegtest(snapshot) => snapshot.timestamp,
            AccountSnapshotFor::EthMainnet(snapshot) => snapshot.timestamp,
            AccountSnapshotFor::EthSepolia(snapshot) => snapshot.timestamp,
            AccountSnapshotFor::Erc20Mainnet(snapshot) => snapshot.timestamp,
            AccountSnapshotFor::Erc20Sepolia(snapshot) => snapshot.timestamp,
        }
    }

    pub fn decimals(&self) -> u8 {
        match self {
            AccountSnapshotFor::Icrcv2(snapshot) => snapshot.decimals,
            AccountSnapshotFor::SolDevnet(snapshot) => snapshot.decimals,
            AccountSnapshotFor::SolMainnet(snapshot) => snapshot.decimals,
            AccountSnapshotFor::SolTestnet(snapshot) => snapshot.decimals,
            AccountSnapshotFor::SolLocal(snapshot) => snapshot.decimals,
            AccountSnapshotFor::SplMainnet(snapshot) => snapshot.decimals,
            AccountSnapshotFor::SplDevnet(snapshot) => snapshot.decimals,
            AccountSnapshotFor::SplTestnet(snapshot) => snapshot.decimals,
            AccountSnapshotFor::SplLocal(snapshot) => snapshot.decimals,
            AccountSnapshotFor::BtcMainnet(snapshot) => snapshot.decimals,
            AccountSnapshotFor::BtcTestnet(snapshot) => snapshot.decimals,
            AccountSnapshotFor::BtcRegtest(snapshot) => snapshot.decimals,
            AccountSnapshotFor::EthMainnet(snapshot) => snapshot.decimals,
            AccountSnapshotFor::EthSepolia(snapshot) => snapshot.decimals,
            AccountSnapshotFor::Erc20Mainnet(snapshot) => snapshot.decimals,
            AccountSnapshotFor::Erc20Sepolia(snapshot) => snapshot.decimals,
        }
    }

    pub fn approx_usd_per_token(&self) -> ComparableFloat {
        match self {
            AccountSnapshotFor::Icrcv2(snapshot) => snapshot.approx_usd_per_token,
            AccountSnapshotFor::SolDevnet(snapshot) => snapshot.approx_usd_per_token,
            AccountSnapshotFor::SolMainnet(snapshot) => snapshot.approx_usd_per_token,
            AccountSnapshotFor::SolTestnet(snapshot) => snapshot.approx_usd_per_token,
            AccountSnapshotFor::SolLocal(snapshot) => snapshot.approx_usd_per_token,
            AccountSnapshotFor::SplMainnet(snapshot) => snapshot.approx_usd_per_token,
            AccountSnapshotFor::SplDevnet(snapshot) => snapshot.approx_usd_per_token,
            AccountSnapshotFor::SplTestnet(snapshot) => snapshot.approx_usd_per_token,
            AccountSnapshotFor::SplLocal(snapshot) => snapshot.approx_usd_per_token,
            AccountSnapshotFor::BtcMainnet(snapshot) => snapshot.approx_usd_per_token,
            AccountSnapshotFor::BtcTestnet(snapshot) => snapshot.approx_usd_per_token,
            AccountSnapshotFor::BtcRegtest(snapshot) => snapshot.approx_usd_per_token,
            AccountSnapshotFor::EthMainnet(snapshot) => snapshot.approx_usd_per_token,
            AccountSnapshotFor::EthSepolia(snapshot) => snapshot.approx_usd_per_token,
            AccountSnapshotFor::Erc20Mainnet(snapshot) => snapshot.approx_usd_per_token,
            AccountSnapshotFor::Erc20Sepolia(snapshot) => snapshot.approx_usd_per_token,
        }
    }

    pub fn amount(&self) -> u64 {
        match self {
            AccountSnapshotFor::Icrcv2(snapshot) => snapshot.amount,
            AccountSnapshotFor::SolDevnet(snapshot) => snapshot.amount,
            AccountSnapshotFor::SolMainnet(snapshot) => snapshot.amount,
            AccountSnapshotFor::SolTestnet(snapshot) => snapshot.amount,
            AccountSnapshotFor::SolLocal(snapshot) => snapshot.amount,
            AccountSnapshotFor::SplMainnet(snapshot) => snapshot.amount,
            AccountSnapshotFor::SplDevnet(snapshot) => snapshot.amount,
            AccountSnapshotFor::SplTestnet(snapshot) => snapshot.amount,
            AccountSnapshotFor::SplLocal(snapshot) => snapshot.amount,
            AccountSnapshotFor::BtcMainnet(snapshot) => snapshot.amount,
            AccountSnapshotFor::BtcTestnet(snapshot) => snapshot.amount,
            AccountSnapshotFor::BtcRegtest(snapshot) => snapshot.amount,
            AccountSnapshotFor::EthMainnet(snapshot) => snapshot.amount,
            AccountSnapshotFor::EthSepolia(snapshot) => snapshot.amount,
            AccountSnapshotFor::Erc20Mainnet(snapshot) => snapshot.amount,
            AccountSnapshotFor::Erc20Sepolia(snapshot) => snapshot.amount,
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
