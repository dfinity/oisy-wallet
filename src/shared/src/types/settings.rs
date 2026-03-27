use candid::{CandidType, Deserialize};

use crate::types::{
    dapp::DappSettings, experimental_feature::ExperimentalFeaturesSettings,
    network::NetworksSettings,
};

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, Default)]
pub struct Settings {
    pub networks: NetworksSettings,
    pub dapp: DappSettings,
    pub experimental_features: ExperimentalFeaturesSettings,
}
