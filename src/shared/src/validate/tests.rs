//! Tests that the validation functions work as expected.
use candid::{CandidType, Decode, Deserialize, Encode};
use serde::{de, Deserializer};

use crate::validate::{
    test_validate_on_deserialize, validate_on_deserialize, TestVector, Validate,
};

/// A toy type to test the validation macro
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
#[serde(remote = "Self")] // Needed to support validate on parse.
struct ToyType {
    name: String,
}
impl ToyType {
    pub const MAX_LEN: usize = 10;
}
impl Validate for ToyType {
    fn validate(&self) -> Result<(), candid::Error> {
        // Deconstruct to avoid accidentally forgetting to check a field:
        let Self { name } = self;
        // Check each field:
        if name.len() > Self::MAX_LEN {
            return Err(candid::Error::msg("Symbol too long"));
        }
        Ok(())
    }
}
validate_on_deserialize!(ToyType);

test_validate_on_deserialize!(
    ToyType,
    vec![
        TestVector {
            input: ToyType {
                name: "a".repeat(ToyType::MAX_LEN),
            },
            valid: true,
            description: "Maximum valid length",
        },
        TestVector {
            input: ToyType {
                name: "a".repeat(ToyType::MAX_LEN + 1),
            },
            valid: false,
            description: "Too long",
        },
    ]
);
