use crate::types::custom_token::{CustomToken, CustomTokenId, Token};
use crate::types::token::UserToken;
use crate::types::{Timestamp, TokenTimestamp};
use ic_cdk::api::time;

impl From<&Token> for CustomTokenId {
    fn from(token: &Token) -> Self {
        match token {
            Token::Icrc(token) => CustomTokenId::Icrc(token.ledger_id),
        }
    }
}

impl TokenTimestamp for UserToken {
    fn get_timestamp(&self) -> Option<Timestamp> {
        self.timestamp
    }

    fn clone_with_current_timestamp(&self) -> Self {
        let mut cloned = self.clone();
        cloned.timestamp = Some(time());
        cloned
    }
}

impl TokenTimestamp for CustomToken {
    fn get_timestamp(&self) -> Option<Timestamp> {
        self.timestamp
    }

    fn clone_with_current_timestamp(&self) -> Self {
        let mut cloned = self.clone();
        cloned.timestamp = Some(time());
        cloned
    }
}
