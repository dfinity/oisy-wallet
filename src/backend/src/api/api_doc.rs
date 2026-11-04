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
        assert!(doc.contains("https://oisy.com/terms-of-use/"));
    }

    /// Agents record agreement acceptance with the values the guide lists, so they must match the
    /// ones the web app records on sign-in.
    #[test]
    fn api_doc_lists_the_current_agreement_versions() {
        let agreements: serde_json::Value =
            serde_json::from_str(include_str!("../../../frontend/src/env/agreements.json"))
                .expect("agreements.json is valid JSON");
        let agreements = agreements
            .as_object()
            .expect("agreements.json is an object");

        assert_eq!(agreements.len(), 3);
        for (name, agreement) in agreements {
            let text_sha256 = agreement["textSha256"]
                .as_str()
                .unwrap_or_else(|| panic!("{name} has a textSha256"));
            let last_updated_at_ms = agreement["lastUpdatedTimestamp"]["__bigint__"]
                .as_str()
                .unwrap_or_else(|| panic!("{name} has a lastUpdatedTimestamp"));

            assert!(
                API_DOC.contains(&format!("`{text_sha256}`")),
                "the API guide lists the textSha256 of {name}"
            );
            assert!(
                API_DOC.contains(&format!("`{last_updated_at_ms}`")),
                "the API guide lists the lastUpdatedTimestamp of {name}"
            );
        }
    }
}
