//! Tests for parsing account identifiers.

use candid::Principal;

use super::*;

struct TestVector {
    name: &'static str,
    input: &'static str,
    expected: TokenAccountId,
}

fn test_vectors() -> Vec<TestVector> {
    vec![TestVector {
        name: "ICRC: Short principal",
        input: "un4fu-tqaaa-aaaab-qadjq-cai",
        expected: TokenAccountId::Icrcv2(Icrcv2AccountId::WithPrincipal {
            owner: Principal::from_text("un4fu-tqaaa-aaaab-qadjq-cai").unwrap(),
            subaccount: None,
        }),
    }]
}

#[test]
fn account_ids_can_be_parsed() {
    for vector in test_vectors() {
        assert_eq!(vector.expected, vector.input.parse().unwrap(), "{}", vector.name);
    }
}
