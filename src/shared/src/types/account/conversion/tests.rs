//! Tests for parsing account identifiers.

use std::fmt::Debug;

use candid::Principal;

use super::*;

struct TestVector<T: Eq + Debug> {
    name: &'static str,
    input: &'static str,
    expected: Result<T, ParseError>,
}

fn icrc2_subaccount_test_vectors() -> Vec<TestVector<IcrcSubaccountId>> {
    vec![
        TestVector {
            name: "ICRC: Subaccount ID",
            input: "7bd35240a80a8752992470ebd6dd38cd58abd60630198d9e79a019418eb533f7",
            expected: Ok(IcrcSubaccountId([
                0x7b, 0xd3, 0x52, 0x40, 0xa8, 0x0a, 0x87, 0x52, 0x99, 0x24, 0x70, 0xeb, 0xd6, 0xdd,
                0x38, 0xcd, 0x58, 0xab, 0xd6, 0x06, 0x30, 0x19, 0x8d, 0x9e, 0x79, 0xa0, 0x19, 0x41,
                0x8e, 0xb5, 0x33, 0xf7,
            ])),
        },
        TestVector {
            name: "ICRC: Incorrect length",
            input: "234143",
            expected: Err(ParseError()),
        },
        TestVector {
            name: "ICRC: Invalid characters",
            input: "7bd35240a80a8752992470ebd6dd38cd58abd6O630198d9e79aO19418eb533f7",
            expected: Err(ParseError()),
        },
    ]
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
            expected: Ok(Icrcv2AccountId::Account(
                IcrcSubaccountId::from_str(
                    "7bd35240a80a8752992470ebd6dd38cd58abd60630198d9e79a019418eb533f7",
                )
                .expect("Test setup err: Failed to parse subaccount ID"),
            )),
        },
        TestVector {
            name: "ICRC: Invalid principal",
            input: "invalid",
            expected: Err(ParseError()),
        },
        TestVector {
            name: "ICRC: Invalid subaccount ID",
            input: "7bd3524Oa80a8752992470ebd6dd38cd58abd60630198d9e79a019418eb533f7",
            expected: Err(ParseError()),
        },
    ]
}

fn solana_test_vectors() -> Vec<TestVector<SolPrincipal>> {
    vec![
        TestVector {
            name: "Solana: Valid Solana ID",
            input: "14grJpemFaf88c8tiVb77W7TYg2W3ir6pfkKz3YjhhZ5",
            expected: Ok(SolPrincipal(
                "14grJpemFaf88c8tiVb77W7TYg2W3ir6pfkKz3YjhhZ5".to_string(),
            )),
        },
        TestVector {
            name: "Solana: Invalid base58",
            input: "14grJpemFaf88c8tiVb77 W7TYg2W3ir6pfkKz3YjhhZ5", /* Valid ID witha  space
                                                                     * inserted */
            expected: Err(ParseError()),
        },
        TestVector {
            name: "Solana: Invalid length",
            input: "J8kUFc4Vo61", // Base 58 encoded "foghorn"
            expected: Err(ParseError()),
        },
    ]
}

fn eth_test_vectors() -> Vec<TestVector<EthAddress>> {
    vec![
        TestVector {
            name: "Ethereum: Valid Ethereum ID",
            input: "0x0000000000000000000000000000000000000000",
            expected: Ok(
                EthAddress::from_str("0x0000000000000000000000000000000000000000").unwrap(),
            ),
        },
        TestVector {
            name: "Ethereum: Invalid length",
            input: "0x000000000000000000000000000000000000000",
            expected: Err(ParseError()),
        },
        TestVector {
            name: "Ethereum: Missing prefix",
            input: "0000000000000000000000000000000000000000",
            expected: Err(ParseError()),
        },
        TestVector {
            name: "Ethereum: Invalid characters",
            input: "0x000000000000000000000000000000000000000O",
            expected: Err(ParseError()),
        },
    ]
}

#[test]
fn icrc2_subaccount_ids_can_be_parsed() {
    for vector in icrc2_subaccount_test_vectors() {
        assert_eq!(vector.expected, vector.input.parse(), "{}", vector.name);
    }
}

#[test]
fn icrc2_account_ids_can_be_parsed() {
    for vector in icrc2_test_vectors() {
        assert_eq!(vector.expected, vector.input.parse(), "{}", vector.name);
    }
}

#[test]
fn solana_account_ids_can_be_parsed() {
    for vector in solana_test_vectors() {
        assert_eq!(vector.expected, vector.input.parse(), "{}", vector.name);
    }
}

#[test]
fn eth_account_ids_can_be_parsed() {
    for vector in eth_test_vectors() {
        assert_eq!(vector.expected, vector.input.parse(), "{}", vector.name);
    }
}
