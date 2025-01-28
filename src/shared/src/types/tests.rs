//! Tests for the types module.

mod custom_token {
    //! Tests for the custom_token module.
    use candid::{Decode, Encode};

    use crate::types::custom_token::*;
    use crate::validate::Validate;

    mod spl {
        //! Tests for the spl module.
        use super::*;
        const SPL_TEST_VECTORS: [(&str, bool); 4] = [
            ("", false),
            ("1", false),
            ("11111111111111111111111111111111", true),
            (
                "11111111111111111111111111111111111111111111111111111111111111111111111111111111",
                false,
            ),
        ];

        #[test]
        fn spl_token_id_parsing_validation_works() {
            for (input, expected) in SPL_TEST_VECTORS.iter() {
                let input = SplTokenId(input.to_string());
                let result = input.validate();
                assert_eq!(*expected, result.is_ok());
            }
        }
        #[test]
        fn spl_token_validation_works_for_candid() {
            for (input, expected) in SPL_TEST_VECTORS.iter() {
                let spl_token_id = SplTokenId(input.to_string());

                let candid = Encode!(&spl_token_id).unwrap();
                let result: Result<SplTokenId, _> = Decode!(&candid, SplTokenId);
                assert_eq!(*expected, result.is_ok());
            }
        }
    }

    mod icrc {
        //! Tests for the icrc module.
        use candid::Principal;

        use super::*;
        struct TestVector {
            input: IcrcToken,
            expected: bool,
            description: &'static str,
        }
        fn test_vectors() -> Vec<TestVector> {
            // Principals to use in the test vectors
            let canister_id1 = Principal::from_text("um5iw-rqaaa-aaaaq-qaaba-cai").unwrap();
            let canister_id2 = Principal::from_text("rdmx6-jaaaa-aaaaa-aaadq-cai").unwrap();
            let user_id = Principal::from_text(
                "tdb26-jop6k-aogll-7ltgs-eruif-6kk7m-qpktf-gdiqx-mxtrf-vb5e6-eqe",
            )
            .unwrap();

            vec![
                TestVector {
                    input: IcrcToken {
                        ledger_id: canister_id1,
                        index_id: None,
                    },
                    expected: true,
                    description: "IcrcToken with valid ledger_id",
                },
                TestVector {
                    input: IcrcToken {
                        ledger_id: canister_id2,
                        index_id: Some(canister_id1),
                    },
                    expected: true,
                    description: "IcrcToken with valid ledger_id and index",
                },
                TestVector {
                    input: IcrcToken {
                        ledger_id: Principal::anonymous(),
                        index_id: None,
                    },
                    expected: false,
                    description: "IcrcToken with anonymous ledger_id",
                },
                TestVector {
                    input: IcrcToken {
                        ledger_id: Principal::anonymous(),
                        index_id: Some(Principal::anonymous()),
                    },
                    expected: false,
                    description: "IcrcToken with anonymous ledger_id and index",
                },
                TestVector {
                    input: IcrcToken {
                        ledger_id: canister_id1,
                        index_id: Some(Principal::anonymous()),
                    },
                    expected: false,
                    description: "IcrcToken with valid ledger_id and anonymous index",
                },
                TestVector {
                    input: IcrcToken {
                        ledger_id: Principal::management_canister(),
                        index_id: Some(canister_id2),
                    },
                    expected: false,
                    description: "IcrcToken with the management canister as ledger_id",
                },
                TestVector {
                    input: IcrcToken {
                        ledger_id: Principal::management_canister(),
                        index_id: Some(Principal::anonymous()),
                    },
                    expected: false,
                    description:
                        "IcrcToken with the management canister as ledger_id and anonymous index",
                },
                TestVector {
                    input: IcrcToken {
                        ledger_id: Principal::management_canister(),
                        index_id: None,
                    },
                    expected: false,
                    description: "IcrcToken with the management canister as ledger_id and no index",
                },
                TestVector {
                    input: IcrcToken {
                        ledger_id: Principal::anonymous(),
                        index_id: Some(Principal::management_canister()),
                    },
                    expected: false,
                    description:
                        "IcrcToken with anonymous ledger_id and the management canister as index",
                },
                TestVector {
                    input: IcrcToken {
                        ledger_id: user_id,
                        index_id: None,
                    },
                    expected: false,
                    description: "IcrcToken with user or network principal as ledger_id",
                },
            ]
        }

        #[test]
        fn validate_icrc_token() {
            for TestVector {
                input,
                expected,
                description,
            } in test_vectors()
            {
                let result = input.validate();
                assert_eq!(expected, result.is_ok(), "{}", description);
            }
        }
    }
}
