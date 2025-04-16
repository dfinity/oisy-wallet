//! Tests for parsing account identifiers.

use std::fmt::Debug;

use candid::Principal;

use super::*;

struct TestVector<T: Eq + Debug> {
    name: &'static str,
    input: &'static str,
    expected: T,
}

fn icrc2_test_vectors() -> Vec<TestVector<Icrcv2AccountId>> {
    vec![TestVector {
        name: "ICRC: Short principal",
        input: "un4fu-tqaaa-aaaab-qadjq-cai",
        expected: Icrcv2AccountId::WithPrincipal {
            owner: Principal::from_text("un4fu-tqaaa-aaaab-qadjq-cai").unwrap(),
            subaccount: None,
        },
    }]
}

#[test]
fn icrc2_account_ids_can_be_parsed() {
    for vector in icrc2_test_vectors() {
        assert_eq!(
            vector.expected,
            vector.input.parse().unwrap(),
            "{}",
            vector.name
        );
    }
}
