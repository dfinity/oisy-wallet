const MAX_TOKEN_LIST_LENGTH: usize = 100;

pub fn extend_user_token<T: Clone>(token: &T, tokens: &mut Vec<T>, find: &dyn Fn(&T) -> bool) {
    match tokens.iter().position(|t| find(t)) {
        Some(p) => {
            tokens[p] = token.clone();
        }
        None => {
            if tokens.len() == MAX_TOKEN_LIST_LENGTH {
                ic_cdk::trap(&format!(
                    "Token list length should not exceed {MAX_TOKEN_LIST_LENGTH}"
                ));
            }
            tokens.push(token.clone());
        }
    }
}
