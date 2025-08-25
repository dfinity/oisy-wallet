use shared::types::custom_token::UserToken;
use shared::types::token::Token;

pub fn assert_tokens_eq(results_tokens: Vec<Token>, expected_tokens: Vec<Token>) {
    assert_eq!(results_tokens.len(), expected_tokens.len());

    for (token, expected) in results_tokens.iter().zip(expected_tokens.iter()) {
        assert_eq!(token.contract_address, expected.contract_address);
        assert_eq!(token.chain_id, expected.chain_id);
        assert_eq!(token.symbol, expected.symbol);
        assert_eq!(token.decimals, expected.decimals);
    }
}

pub fn assert_custom_tokens_eq(results_tokens: Vec<UserToken>, expected_tokens: Vec<UserToken>) {
    assert_eq!(results_tokens.len(), expected_tokens.len());

    for (token, expected) in results_tokens.iter().zip(expected_tokens.iter()) {
        assert!(expected == token);
    }
}
