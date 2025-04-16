//! Tests for parsing account identifiers.

use std::fmt::Debug;

use candid::Principal;

use super::*;

struct TestVector<T: Eq + Debug> {
    name: &'static str,
    input: &'static str,
    expected: Result<T, ParseError>,
}

fn icrc2_test_vectors() -> Vec<TestVector<Icrcv2AccountId>> {
    vec![
        TestVector {
            name: "ICRC: Short principal",
            input: "un4fu-tqaaa-aaaab-qadjq-cai",
            expected: Ok(Icrcv2AccountId::WithPrincipal {
                owner: Principal::from_text("un4fu-tqaaa-aaaab-qadjq-cai").unwrap(),
                subaccount: None,
            }),
        },
        TestVector {
            name: "ICRC: Long principal",
            input: "nggqm-p5ozz-i5hfv-bejmq-2gtow-4dtqw-vjatn-4b4yw-s5mzs-i46su-6ae",
            expected: Ok(Icrcv2AccountId::WithPrincipal {
                owner: Principal::from_text(
                    "nggqm-p5ozz-i5hfv-bejmq-2gtow-4dtqw-vjatn-4b4yw-s5mzs-i46su-6ae",
                )
                .unwrap(),
                subaccount: None,
            }),
        },
        TestVector {
            name: "ICRC: Account ID",
            input: "7bd35240a80a8752992470ebd6dd38cd58abd60630198d9e79a019418eb533f7",
            expected: Ok(Icrcv2AccountId::Account(IcrcSubaccountId::from_str(
                "7bd35240a80a8752992470ebd6dd38cd58abd60630198d9e79a019418eb533f7",
            ))),
        },
        TestVector {
            name: "ICRC: Invalid principal",
            input: "invalid",
            expected: Err(ParseError),
        },
    ]
}

#[test]
fn icrc2_account_ids_can_be_parsed() {
    for vector in icrc2_test_vectors() {
        assert_eq!(vector.expected, vector.input.parse(), "{}", vector.name);
    }
}
