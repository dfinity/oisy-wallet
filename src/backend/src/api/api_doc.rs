use ic_cdk::query;

const API_DOC: &str = include_str!("api_doc.md");

/// Returns usage guidance for AI agents and other API clients.
///
/// The Candid interface remains the source of truth for method signatures and
/// exact error variants.
#[query]
#[must_use]
pub fn get_api_doc() -> &'static str {
    API_DOC
}

#[cfg(test)]
mod tests {
    use super::API_DOC;

    #[test]
    fn api_doc_describes_scope_and_transaction_limits() {
        // Normalise whitespace so rewrapping the guide doesn't break the assertions.
        let doc = API_DOC.split_whitespace().collect::<Vec<_>>().join(" ");
        assert!(doc.contains("caller principal"));
        assert!(doc.contains("does not provide a generic method to transfer tokens"));
        assert!(doc.contains("Candid interface"));
        assert!(doc.contains("not certified"));
    }
}
