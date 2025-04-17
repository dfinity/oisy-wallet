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
            expected: Err(ParseError::InvalidLength),
        },
        TestVector {
            name: "ICRC: Invalid characters",
            input: "7bd35240a80a8752992470ebd6dd38cd58abd6O630198d9e79aO19418eb533f7",
            expected: Err(ParseError::InvalidEncoding),
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
            expected: Err(ParseError::UnsupportedFormat),
        },
        TestVector {
            name: "ICRC: Invalid subaccount ID",
            input: "7bd3524Oa80a8752992470ebd6dd38cd58abd60630198d9e79a019418eb533f7",
            expected: Err(ParseError::InvalidEncoding),
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
            expected: Err(ParseError::InvalidEncoding),
        },
        TestVector {
            name: "Solana: Invalid length",
            input: "J8kUFc4Vo61", // Base 58 encoded "foghorn"
            expected: Err(ParseError::InvalidLength),
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
            expected: Err(ParseError::InvalidLength),
        },
        TestVector {
            name: "Ethereum: Missing prefix",
            input: "0000000000000000000000000000000000000000",
            expected: Err(ParseError::InvalidPrefix),
        },
        TestVector {
            name: "Ethereum: Invalid characters",
            input: "0x000000000000000000000000000000000000000O",
            expected: Err(ParseError::InvalidEncoding),
        },
    ]
}

fn btc_test_vectors() -> Vec<TestVector<BtcAddress>> {
    vec![
        TestVector {
            name: "BTC: P2PKH",
            input: "1RainRzqJtJxHTngafpCejDLfYq2y4KBc",
            expected: Ok(BtcAddress::P2PKH(
                "1RainRzqJtJxHTngafpCejDLfYq2y4KBc".to_string(),
            )),
        },
        TestVector {
            name: "BTC: P2SH",
            input: "342ftSRCvFHfCeFFBuz4xwbeqnDw6BGUey",
            expected: Ok(BtcAddress::P2SH(
                "342ftSRCvFHfCeFFBuz4xwbeqnDw6BGUey".to_string(),
            )),
        },
        TestVector {
            name: "BTC: P2WPKH",
            input: "bc1q34aq5drpuwy3wgl9lhup9892qp6svr8ldzyy7c",
            expected: Ok(BtcAddress::P2WPKH(
                "bc1q34aq5drpuwy3wgl9lhup9892qp6svr8ldzyy7c".to_string(),
            )),
        },
        TestVector {
            name: "BTC: P2WSH",
            input: "bc1qeklep85ntjz4605drds6aww9u0qr46qzrv5xswd35uhjuj8ahfcqgf6hak",
            expected: Ok(BtcAddress::P2WSH(
                "bc1qeklep85ntjz4605drds6aww9u0qr46qzrv5xswd35uhjuj8ahfcqgf6hak".to_string(),
            )),
        },
        TestVector {
            name: "BTC: P2TR",
            input: "bc1pxwww0ct9ue7e8tdnlmug5m2tamfn7q06sahstg39ys4c9f3340qqxrdu9k",
            expected: Ok(BtcAddress::P2TR(
                "bc1pxwww0ct9ue7e8tdnlmug5m2tamfn7q06sahstg39ys4c9f3340qqxrdu9k".to_string(),
            )),
        },
    ]
}

impl From<TestVector<Icrcv2AccountId>> for TestVector<TokenAccountId> {
    fn from(value: TestVector<Icrcv2AccountId>) -> Self {
        let TestVector {
            name,
            input,
            expected,
        } = value;
        TestVector {
            name,
            input,
            expected: expected
                .map(TokenAccountId::Icrcv2)
                .map_err(|_| ParseError::UnsupportedFormat),
        }
    }
}

impl From<TestVector<SolPrincipal>> for TestVector<TokenAccountId> {
    fn from(value: TestVector<SolPrincipal>) -> Self {
        let TestVector {
            name,
            input,
            expected,
        } = value;
        TestVector {
            name,
            input,
            expected: expected
                .map(TokenAccountId::Sol)
                .map_err(|_| ParseError::UnsupportedFormat),
        }
    }
}

impl From<TestVector<EthAddress>> for TestVector<TokenAccountId> {
    fn from(value: TestVector<EthAddress>) -> Self {
        let TestVector {
            name,
            input,
            expected,
        } = value;
        TestVector {
            name,
            input,
            expected: expected
                .map(TokenAccountId::Eth)
                .map_err(|_| ParseError::UnsupportedFormat),
        }
    }
}

impl From<TestVector<BtcAddress>> for TestVector<TokenAccountId> {
    fn from(value: TestVector<BtcAddress>) -> Self {
        let TestVector {
            name,
            input,
            expected,
        } = value;
        TestVector {
            name,
            input,
            expected: expected
                .map(TokenAccountId::Btc)
                .map_err(|_| ParseError::UnsupportedFormat),
        }
    }
}

fn all_test_vectors() -> Vec<TestVector<TokenAccountId>> {
    icrc2_test_vectors()
        .into_iter()
        .map(TestVector::<TokenAccountId>::from)
        .chain(
            solana_test_vectors()
                .into_iter()
                .map(TestVector::<TokenAccountId>::from),
        )
        .chain(
            eth_test_vectors()
                .into_iter()
                .map(TestVector::<TokenAccountId>::from),
        )
        .chain(
            btc_test_vectors()
                .into_iter()
                .map(TestVector::<TokenAccountId>::from),
        )
        .collect()
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

#[test]
fn btc_account_ids_can_be_parsed() {
    for vector in btc_test_vectors() {
        assert_eq!(vector.expected, vector.input.parse(), "{}", vector.name);
    }
}

#[test]
fn all_test_vectors_can_be_parsed() {
    for vector in all_test_vectors() {
        assert_eq!(vector.expected, vector.input.parse(), "{}", vector.name);
    }
}
