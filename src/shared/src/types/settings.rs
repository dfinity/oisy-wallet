use candid::{CandidType, Deserialize};

use crate::types::{
    dapp::DappSettings, experimental_feature::ExperimentalFeaturesSettings,
    network::NetworksSettings, notification::NotificationSettings,
    transaction_settings::TransactionSettings,
};

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, Default)]
pub struct Settings {
    pub networks: NetworksSettings,
    pub dapp: DappSettings,
    pub experimental_features: ExperimentalFeaturesSettings,
    pub notifications: Option<NotificationSettings>,
    pub transactions: Option<TransactionSettings>,
}
