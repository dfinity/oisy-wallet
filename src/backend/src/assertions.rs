use crate::MAX_SYMBOL_LENGTH;
use shared::types::token::UserToken;

pub fn assert_token_symbol_length(token: &UserToken) -> Result<(), String> {
    if let Some(symbol) = token.symbol.as_ref() {
        if symbol.len() > MAX_SYMBOL_LENGTH {
            return Err(format!(
                "Token symbol should not exceed {MAX_SYMBOL_LENGTH} bytes",
            ));
        }
    }

    Ok(())
}
