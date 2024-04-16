use crate::types::custom_token::{CustomTokenId, Token};

impl From<&Token> for CustomTokenId {
    fn from(token: &Token) -> Self {
        match token {
            Token::Icrc(token) => CustomTokenId::Icrc(token.ledger_id),
        }
    }
}
