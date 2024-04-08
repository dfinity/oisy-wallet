use crate::types::UserToken;

impl UserToken {
    pub fn matches(&self, other: &UserToken) -> bool {
        match (self, other) {
            (UserToken::Icrc(t), UserToken::Icrc(token)) => t.ledger_id == token.ledger_id,
        }
    }
}
