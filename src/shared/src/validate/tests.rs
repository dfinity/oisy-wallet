//! Tests that the validation functions work as expected.
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

macro_rules! test_validate_on_deserialize {
    ($type:ty) => {
        #[test]
        fn validates_on_deserialize() {
            for TestVector {
                input,
                valid,
                description,
            } in test_vectors()
            {
                let result = input.validate();
                assert_eq!(
                    valid,
                    result.is_ok(),
                    "Validation does not match for: {}",
                    description
                );

                let candid = Encode!(&input).unwrap();
                let result: Result<$type, _> = Decode!(&candid, $type);
                assert_eq!(
                    valid,
                    result.is_ok(),
                    "Candid deserialization did not match for: {}",
                    description
                );
                if valid {
                    assert_eq!(input, result.unwrap());
                }
            }
        }
    };
}
pub(crate) use test_validate_on_deserialize;
