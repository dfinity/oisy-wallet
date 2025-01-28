//! Tests that the validation functions work as expected.
use crate::validate::test_validate_on_deserialize;
use crate::validate::validate_on_deserialize;
use crate::validate::Validate;
use candid::{CandidType, Decode, Deserialize, Encode};
use serde::{de, Deserializer};

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

struct TestVector {
    input: ToyType,
    valid: bool,
    description: &'static str,
}

fn test_vectors() -> Vec<TestVector> {
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
}

test_validate_on_deserialize! {ToyType}
