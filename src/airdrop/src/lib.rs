use ic_cdk_macros::{export_candid, query};

#[query]
fn greet(name: String) -> String {
    format!("Hello, {}!", name)
}

// Generate did files

export_candid!();