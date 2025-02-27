use shared::types::{token::UserToken, MAX_SYMBOL_LENGTH};

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

pub fn assert_token_enabled_is_some(UserToken { enabled, .. }: &UserToken) -> Result<(), String> {
    if enabled.is_none() {
        return Err("Token should either be enabled or disabled".to_string());
    }

    Ok(())
}
