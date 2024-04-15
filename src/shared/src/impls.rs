use crate::types::custom_token::{CustomToken, CustomTokenId};

impl From<CustomToken> for CustomTokenId {
    fn from(token: CustomToken) -> Self {
        match token {
            CustomToken::Icrc(token) => CustomTokenId::Icrc(token.ledger_id),
        }
    }
}
