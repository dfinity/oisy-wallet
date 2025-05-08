//! Tests for the types module.

mod bitcoin {
    //! Tests for the bitcoin types.
    use candid::{Decode, Encode};
    use ic_cdk::api::management_canister::bitcoin::{BitcoinNetwork, Outpoint, Utxo};

    use crate::{
        types::bitcoin::{
            BtcAddPendingTransactionRequest, BtcGetPendingTransactionsRequest, PendingTransaction,
            MAX_ADDRESS_LEN, MAX_TXID_BYTES, MAX_UTXOS_LEN,
        },
        validate::{test_validate_on_deserialize, TestVector, Validate},
    };

    test_validate_on_deserialize!(
        BtcAddPendingTransactionRequest,
        vec![
            TestVector {
                description: "BtcAddPendingTransactionRequest with max length txid",
                input: BtcAddPendingTransactionRequest {
                    txid: vec![0; MAX_TXID_BYTES],
                    utxos: vec![],
                    address: "".to_string(),
                    network: BitcoinNetwork::Mainnet,
                },
                valid: true,
            },
            TestVector {
                description: "BtcAddPendingTransactionRequest with txid too long",
                input: BtcAddPendingTransactionRequest {
                    txid: vec![0; MAX_TXID_BYTES + 1],
                    utxos: vec![],
                    address: "".to_string(),
                    network: BitcoinNetwork::Mainnet,
                },
                valid: false,
            },
            TestVector {
                description: "With a utxo of maximal length",
                input: BtcAddPendingTransactionRequest {
                    txid: vec![0; MAX_TXID_BYTES],
                    utxos: vec![Utxo {
                        outpoint: Outpoint {
                            txid: vec![0; MAX_TXID_BYTES],
                            vout: 0,
                        },
                        value: 0,
                        height: 0,
                    }],
                    address: "".to_string(),
                    network: BitcoinNetwork::Mainnet,
                },
                valid: true,
            },
            TestVector {
                description: "With a utxo that is too long",
                input: BtcAddPendingTransactionRequest {
                    txid: vec![0; MAX_TXID_BYTES],
                    utxos: vec![Utxo {
                        outpoint: Outpoint {
                            txid: vec![0; MAX_TXID_BYTES + 1],
                            vout: 0,
                        },
                        value: 0,
                        height: 0,
                    }],
                    address: "".to_string(),
                    network: BitcoinNetwork::Mainnet,
                },
                valid: false,
            },
            TestVector {
                description: "With too many utxos",
                input: BtcAddPendingTransactionRequest {
                    txid: vec![0; MAX_TXID_BYTES],
                    utxos: vec![
                        Utxo {
                            outpoint: Outpoint {
                                txid: vec![0; MAX_TXID_BYTES],
                                vout: 0
                            },
                            value: 0,
                            height: 0,
                        };
                        MAX_UTXOS_LEN + 1
                    ],
                    address: "".to_string(),
                    network: BitcoinNetwork::Mainnet,
                },
                valid: false,
            },
        ]
    );

    test_validate_on_deserialize!(
        BtcGetPendingTransactionsRequest,
        vec![
            TestVector {
                description: "BtcGetPendingTransactionsRequest with max length address",
                input: BtcGetPendingTransactionsRequest {
                    address: "1".repeat(MAX_ADDRESS_LEN),
                    network: BitcoinNetwork::Mainnet,
                },
                valid: true,
            },
            TestVector {
                description: "BtcGetPendingTransactionsRequest with address too long",
                input: BtcGetPendingTransactionsRequest {
                    address: "1".repeat(MAX_ADDRESS_LEN + 1),
                    network: BitcoinNetwork::Mainnet,
                },
                valid: false,
            },
        ]
    );

    test_validate_on_deserialize!(
        PendingTransaction,
        vec![
            TestVector {
                description: "PendingTransaction with max length txid",
                input: PendingTransaction {
                    txid: vec![0; MAX_TXID_BYTES],
                    utxos: vec![],
                },
                valid: true,
            },
            TestVector {
                description: "PendingTransaction with txid too long",
                input: PendingTransaction {
                    txid: vec![0; MAX_TXID_BYTES + 1],
                    utxos: vec![],
                },
                valid: false,
            },
            TestVector {
                description: "PendingTransaction with too many utxos",
                input: PendingTransaction {
                    txid: vec![0; MAX_TXID_BYTES],
                    utxos: vec![
                        Utxo {
                            outpoint: Outpoint {
                                txid: vec![0; MAX_TXID_BYTES],
                                vout: 0,
                            },
                            value: 0,
                            height: 0,
                        };
                        MAX_UTXOS_LEN + 1
                    ],
                },
                valid: false,
            },
            TestVector {
                description: "PendingTransaction with a utxo that is too long",
                input: PendingTransaction {
                    txid: vec![0; MAX_TXID_BYTES],
                    utxos: vec![Utxo {
                        outpoint: Outpoint {
                            txid: vec![0; MAX_TXID_BYTES + 1],
                            vout: 0,
                        },
                        value: 0,
                        height: 0,
                    }],
                },
                valid: false,
            },
        ]
    );
}

mod custom_token {
    //! Tests for the `custom_token` module.
    use candid::{Decode, Encode};

    use crate::types::custom_token::*;

    mod spl {
        //! Tests for the spl module.
        use super::*;
        use crate::{
            types::MAX_SYMBOL_LENGTH,
            validate::{test_validate_on_deserialize, TestVector, Validate},
        };

        test_validate_on_deserialize!(
            SplToken,
            vec![
                TestVector {
                    input: SplToken {
                        token_address: SplTokenId("1".repeat(32)),
                        symbol: Some("☃☃☃ ☃ ☃☃☃".to_string()),
                        decimals: Some(6),
                    },
                    valid: true,
                    description: "Valid SplToken",
                },
                TestVector {
                    input: SplToken {
                        token_address: SplTokenId("1".repeat(32)),
                        symbol: None,
                        decimals: None,
                    },
                    valid: true,
                    description: "SplToken without a symbol or decimals",
                },
                TestVector {
                    input: SplToken {
                        token_address: SplTokenId("1".repeat(99)),
                        symbol: Some("Bouncy Castle".to_string()),
                        decimals: Some(6),
                    },
                    valid: false,
                    description: "SplToken with a token address that is too long",
                },
                TestVector {
                    input: SplToken {
                        token_address: SplTokenId("1".repeat(32)),
                        symbol: Some("B".repeat(MAX_SYMBOL_LENGTH + 1)),
                        decimals: Some(6),
                    },
                    valid: false,
                    description: "Too long symbol",
                },
                TestVector {
                    input: SplToken {
                        token_address: SplTokenId("1".repeat(32)),
                        symbol: Some("Bouncy Castle".to_string()),
                        decimals: Some(255),
                    },
                    valid: true,
                    description: "Maximum decimals",
                },
                TestVector {
                    input: SplToken {
                        token_address: SplTokenId("1".repeat(32)),
                        symbol: Some("Bouncy Castle".to_string()),
                        decimals: Some(0),
                    },
                    valid: true,
                    description: "Minimum decimals",
                },
            ]
        );
    }

    mod icrc {
        //! Tests for the icrc module.
        use candid::Principal;

        use super::*;
        use crate::validate::{test_validate_on_deserialize, TestVector, Validate};

        fn canister_id1() -> Principal {
            Principal::from_text("um5iw-rqaaa-aaaaq-qaaba-cai").unwrap()
        }
        fn canister_id2() -> Principal {
            Principal::from_text("rdmx6-jaaaa-aaaaa-aaadq-cai").unwrap()
        }
        fn user_id() -> Principal {
            Principal::from_text("tdb26-jop6k-aogll-7ltgs-eruif-6kk7m-qpktf-gdiqx-mxtrf-vb5e6-eqe")
                .unwrap()
        }

        test_validate_on_deserialize!(
            IcrcToken,
            vec![
                TestVector {
                    input: IcrcToken {
                        ledger_id: canister_id1(),
                        index_id: None,
                    },
                    valid: true,
                    description: "IcrcToken with valid ledger_id",
                },
                TestVector {
                    input: IcrcToken {
                        ledger_id: canister_id2(),
                        index_id: Some(canister_id1()),
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
                        ledger_id: canister_id1(),
                        index_id: Some(Principal::anonymous()),
                    },
                    valid: false,
                    description: "IcrcToken with valid ledger_id and anonymous index",
                },
                TestVector {
                    input: IcrcToken {
                        ledger_id: Principal::management_canister(),
                        index_id: Some(canister_id2()),
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
                        ledger_id: user_id(),
                        index_id: None,
                    },
                    valid: false,
                    description: "IcrcToken with user or network principal as ledger_id",
                },
            ]
        );
    }
}
