//! Tests for the types module.

mod custom_token {
    //! Tests for the custom_token module.
    use candid::{Decode, Encode};

    use crate::types::custom_token::*;
    use crate::validate::Validate;

    mod icrc {
        //! Tests for the icrc module.
        use super::*;
        use crate::validate::test_validate_on_deserialize;
        use candid::Principal;
        struct TestVector {
            input: IcrcToken,
            valid: bool,
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
                    valid: true,
                    description: "IcrcToken with valid ledger_id",
                },
                TestVector {
                    input: IcrcToken {
                        ledger_id: canister_id2,
                        index_id: Some(canister_id1),
                    },
                    valid: true,
                    description: "IcrcToken with valid ledger_id and index",
                },
                TestVector {
                    input: IcrcToken {
                        ledger_id: Principal::anonymous(),
                        index_id: None,
                    },
                    valid: false,
                    description: "IcrcToken with anonymous ledger_id",
                },
                TestVector {
                    input: IcrcToken {
                        ledger_id: Principal::anonymous(),
                        index_id: Some(Principal::anonymous()),
                    },
                    valid: false,
                    description: "IcrcToken with anonymous ledger_id and index",
                },
                TestVector {
                    input: IcrcToken {
                        ledger_id: canister_id1,
                        index_id: Some(Principal::anonymous()),
                    },
                    valid: false,
                    description: "IcrcToken with valid ledger_id and anonymous index",
                },
                TestVector {
                    input: IcrcToken {
                        ledger_id: Principal::management_canister(),
                        index_id: Some(canister_id2),
                    },
                    valid: false,
                    description: "IcrcToken with the management canister as ledger_id",
                },
                TestVector {
                    input: IcrcToken {
                        ledger_id: Principal::management_canister(),
                        index_id: Some(Principal::anonymous()),
                    },
                    valid: false,
                    description:
                        "IcrcToken with the management canister as ledger_id and anonymous index",
                },
                TestVector {
                    input: IcrcToken {
                        ledger_id: Principal::management_canister(),
                        index_id: None,
                    },
                    valid: false,
                    description: "IcrcToken with the management canister as ledger_id and no index",
                },
                TestVector {
                    input: IcrcToken {
                        ledger_id: Principal::anonymous(),
                        index_id: Some(Principal::management_canister()),
                    },
                    valid: false,
                    description:
                        "IcrcToken with anonymous ledger_id and the management canister as index",
                },
                TestVector {
                    input: IcrcToken {
                        ledger_id: user_id,
                        index_id: None,
                    },
                    valid: false,
                    description: "IcrcToken with user or network principal as ledger_id",
                },
            ]
        }
        test_validate_on_deserialize! {IcrcToken}
    }
}
