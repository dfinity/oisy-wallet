use crate::types::custom_token::{CustomToken, UserTokenId};

impl From<CustomToken> for UserTokenId {
    fn from(token: CustomToken) -> Self {
        match token {
            CustomToken::Icrc(token) => UserTokenId::Icrc(token.ledger_id),
        }
    }
}
