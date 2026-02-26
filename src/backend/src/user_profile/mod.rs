pub(crate) mod credential_config;
pub(crate) mod model;
mod service;

pub use model::UserProfileModel;
pub use service::{
    add_credential, add_hidden_dapp_id, create_profile, find_profile, has_user_profile,
    set_show_testnets, update_agreements, update_experimental_feature_settings,
    update_network_settings,
};
