use crate::types::token::{UserToken, UserTokenId};

impl From<UserToken> for UserTokenId {
    fn from(token: UserToken) -> Self {
        match token {
            UserToken::Icrc(token) => UserTokenId::Icrc(token.ledger_id),
        }
    }
}
