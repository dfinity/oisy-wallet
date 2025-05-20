use shared::types::token::UserToken;

pub fn assert_token_enabled_is_some(UserToken { enabled, .. }: &UserToken) -> Result<(), String> {
    if enabled.is_none() {
        return Err("Token should either be enabled or disabled".to_string());
    }

    Ok(())
}
