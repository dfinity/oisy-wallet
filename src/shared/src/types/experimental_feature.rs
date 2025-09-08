use std::collections::BTreeMap;

use candid::{CandidType, Deserialize};

use crate::types::{experimental_feature::marker_trait::ExperimentalFeature, Version};

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, Default)]
pub struct ExperimentalFeatureSettings {
    pub enabled: bool,
}

/// A flat list of logical experimental features.
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, Ord, PartialOrd)]
pub enum ExperimentalFeatureSettingsFor {
    AiAssistantBeta,
}

/// A list of logical experimental features grouped by type.
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub enum ExperimentalFeatureId {
    AiAssistant(AiAssistantExperimentalFeatureId),
}
impl ExperimentalFeature for ExperimentalFeatureId {}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
#[repr(u64)]
pub enum AiAssistantExperimentalFeatureId {
    Beta,
}
impl ExperimentalFeature for AiAssistantExperimentalFeatureId {}

pub type ExperimentalFeatureSettingsMap =
    BTreeMap<ExperimentalFeatureSettingsFor, ExperimentalFeatureSettings>;

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, Default)]
pub struct ExperimentalFeaturesSettings {
    pub experimental_features: ExperimentalFeatureSettingsMap,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum UpdateExperimentalFeaturesSettingsError {
    UserNotFound,
    VersionMismatch,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct UpdateExperimentalFeaturesSettingsRequest {
    pub experimental_features: ExperimentalFeatureSettingsMap,
    pub current_user_version: Option<Version>,
}

pub mod marker_trait {
    use candid::{CandidType, Deserialize};
    use serde::Serialize;

    /// A marker trait, used to indicate that something is an experimental feature.
    pub trait ExperimentalFeature {}

    /// A marker trait, used to indicate that a type is to be used with the Ai Assistant.
    #[derive(CandidType, Serialize, Deserialize, Clone, Debug, Eq, PartialEq)]
    pub struct AiAssistantBeta {}
    impl ExperimentalFeature for AiAssistantBeta {}
}
