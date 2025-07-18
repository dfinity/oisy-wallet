use candid::{CandidType, Deserialize};

use crate::types::{dapp::DappSettings, network::NetworksSettings};

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, Default)]
pub struct Settings {
    pub networks: NetworksSettings,
    pub dapp: DappSettings,
}
