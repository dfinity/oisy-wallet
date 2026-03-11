use candid::{CandidType, Deserialize};

#[derive(CandidType, Deserialize, Clone, Debug, Default, Eq, PartialEq)]
pub struct ApiKeys {
    pub etherscan_api_key: Option<String>,
    pub infura_api_key: Option<String>,
    pub alchemy_api_key: Option<String>,
    pub coingecko_api_key: Option<String>,
}
