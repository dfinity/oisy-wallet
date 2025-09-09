//! Tests for the types module.

mod bitcoin {
    //! Tests for the bitcoin types.
    use candid::{Decode, Encode};
    use ic_cdk::bitcoin_canister::{Network, Outpoint, Utxo};

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
                    network: Network::Mainnet,
                },
                valid: true,
            },
            TestVector {
                description: "BtcAddPendingTransactionRequest with txid too long",
                input: BtcAddPendingTransactionRequest {
                    txid: vec![0; MAX_TXID_BYTES + 1],
                    utxos: vec![],
                    address: "".to_string(),
                    network: Network::Mainnet,
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
                    network: Network::Mainnet,
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
                    network: Network::Mainnet,
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
                    network: Network::Mainnet,
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
                    network: Network::Mainnet,
                },
                valid: true,
            },
            TestVector {
                description: "BtcGetPendingTransactionsRequest with address too long",
                input: BtcGetPendingTransactionsRequest {
                    address: "1".repeat(MAX_ADDRESS_LEN + 1),
                    network: Network::Mainnet,
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

mod contact_image {
    //! Tests for ContactImage validation
    use candid::{Decode, Encode};
    use serde_bytes::ByteBuf;

    use crate::{
        types::contact::{ContactImage, ImageMimeType, MAX_IMAGE_SIZE_BYTES},
        validate::{test_validate_on_deserialize, TestVector, Validate},
    };

    test_validate_on_deserialize!(
        ContactImage,
        vec![
            TestVector {
                description: "ContactImage at max size (100 KB)",
                input: ContactImage {
                    data: ByteBuf::from(vec![0u8; MAX_IMAGE_SIZE_BYTES]),
                    mime_type: ImageMimeType::Png,
                },
                valid: true,
            },
            TestVector {
                description: "ContactImage exceeding max size (100 KB + 1)",
                input: ContactImage {
                    data: ByteBuf::from(vec![0u8; MAX_IMAGE_SIZE_BYTES + 1]),
                    mime_type: ImageMimeType::Jpeg,
                },
                valid: false,
            },
        ]
    );

    // Additional unit test ensuring Validate::validate works directly
    #[test]
    fn contact_image_validate_direct() {
        let ok = ContactImage {
            data: ByteBuf::from(vec![0u8; MAX_IMAGE_SIZE_BYTES]),
            mime_type: ImageMimeType::Webp,
        };
        assert!(ok.validate().is_ok());

        let too_big = ContactImage {
            data: ByteBuf::from(vec![0u8; MAX_IMAGE_SIZE_BYTES + 1]),
            mime_type: ImageMimeType::Gif,
        };
        assert!(too_big.validate().is_err());
    }

    mod spl {
        //! Tests for the spl module.
        use super::*;
        use crate::{
            types::{
                custom_token::{SplToken, SplTokenId},
                MAX_SYMBOL_LENGTH,
            },
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

    mod erc20 {
        //! Tests for the erc20 module.
        use super::*;
        use crate::{
            types::custom_token::{ErcToken, ErcTokenId},
            validate::{test_validate_on_deserialize, TestVector, Validate},
        };

        test_validate_on_deserialize!(
            ErcToken,
            vec![
                TestVector {
                    input: ErcToken {
                        token_address: ErcTokenId(
                            "0x1234567890123456789012345678901234567890".to_string()
                        ),
                        chain_id: 1
                    },
                    valid: true,
                    description: "Valid Erc20Token",
                },
                TestVector {
                    input: ErcToken {
                        token_address: ErcTokenId(
                            "0x12345678901234567890123456789012345678".to_string()
                        ),
                        chain_id: 1
                    },
                    valid: false,
                    description: "Erc20Token with a token address that is too short",
                },
                TestVector {
                    input: ErcToken {
                        token_address: ErcTokenId("1".repeat(99)),
                        chain_id: 1
                    },
                    valid: false,
                    description: "Erc20Token with a token address that is too long",
                },
                TestVector {
                    input: ErcToken {
                        token_address: ErcTokenId(
                            "0x1234567890123456789012345678901234567890".to_string()
                        ),
                        chain_id: u64::MAX
                    },
                    valid: true,
                    description: "Maximum chain ID",
                },
                TestVector {
                    input: ErcToken {
                        token_address: ErcTokenId(
                            "0x1234567890123456789012345678901234567890".to_string()
                        ),
                        chain_id: 0
                    },
                    valid: true,
                    description: "Minimum chain ID",
                },
            ]
        );
    }

    mod icrc {
        //! Tests for the icrc module.
        use candid::Principal;

        use super::*;
        use crate::{
            types::custom_token::IcrcToken,
            validate::{test_validate_on_deserialize, TestVector, Validate},
        };

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

mod token {
    use candid::{Decode, Encode};

    use crate::{
        types::{token::UserToken, MAX_SYMBOL_LENGTH},
        validate::{test_validate_on_deserialize, TestVector, Validate},
    };

    test_validate_on_deserialize!(
        UserToken,
        vec![
            TestVector {
                description: "UserToken with valid contract address",
                input: UserToken {
                    contract_address: "0x1234567890123456789012345678901234567890".to_string(),
                    chain_id: 1,
                    symbol: Some("Bouncy Castle".to_string()),
                    decimals: Some(6),
                    version: None,
                    enabled: None,
                },
                valid: true,
            },
            TestVector {
                description: "UserToken with contract address too long",
                input: UserToken {
                    contract_address: "0x12345678901234567890123456789012345678901".to_string(),
                    chain_id: 1,
                    symbol: Some("Bouncy Castle".to_string()),
                    decimals: Some(6),
                    version: None,
                    enabled: None,
                },
                valid: false,
            },
            TestVector {
                description: "UserToken with contract address too short",
                input: UserToken {
                    contract_address: "0x123456789012345678901234567890123456789".to_string(),
                    chain_id: 1,
                    symbol: Some("Bouncy Castle".to_string()),
                    decimals: Some(6),
                    version: None,
                    enabled: None,
                },
                valid: false,
            },
            TestVector {
                description: "UserToken with symbol too long",
                input: UserToken {
                    contract_address: "0x1234567890123456789012345678901234567890".to_string(),
                    chain_id: 1,
                    symbol: Some("B".repeat(MAX_SYMBOL_LENGTH + 1)),
                    decimals: Some(6),
                    version: None,
                    enabled: None,
                },
                valid: false,
            },
        ]
    );
}

mod user_profile {
    //! Tests for the `user_profile` types.
    use std::collections::HashMap;

    use candid::{Decode, Encode, Principal};
    use ic_verifiable_credentials::issuer_api::{ArgumentValue, CredentialSpec};

    use crate::{
        types::{
            user_profile::{
                AddUserCredentialRequest, UserCredential, UserProfile, MAX_ISSUER_LENGTH,
            },
            verifiable_credential::CredentialType,
        },
        validate::{test_validate_on_deserialize, TestVector, Validate},
    };

    test_validate_on_deserialize!(
        UserCredential,
        vec![
            TestVector {
                description: "UserCredential with max length issuer",
                input: UserCredential {
                    credential_type: CredentialType::ProofOfUniqueness,
                    issuer: "1".repeat(MAX_ISSUER_LENGTH),
                    verified_date_timestamp: None,
                },
                valid: true,
            },
            TestVector {
                description: "UserCredential with issuer too long",
                input: UserCredential {
                    credential_type: CredentialType::ProofOfUniqueness,
                    issuer: "1".repeat(MAX_ISSUER_LENGTH + 1),
                    verified_date_timestamp: None,
                },
                valid: false,
            },
        ]
    );

    fn sample_user_credential() -> UserCredential {
        UserCredential {
            credential_type: CredentialType::ProofOfUniqueness,
            issuer: "1".repeat(MAX_ISSUER_LENGTH),
            verified_date_timestamp: None,
        }
    }

    test_validate_on_deserialize!(
        UserProfile,
        vec![
            TestVector {
                description: "UserProfile with max length credentials",
                input: UserProfile {
                    credentials: vec![sample_user_credential(); UserProfile::MAX_CREDENTIALS],
                    created_timestamp: 0,
                    updated_timestamp: 0,
                    version: None,
                    settings: None,
                    agreements: None,
                },
                valid: true,
            },
            TestVector {
                description: "UserProfile with too many credentials",
                input: UserProfile {
                    credentials: vec![sample_user_credential(); UserProfile::MAX_CREDENTIALS + 1],
                    created_timestamp: 0,
                    updated_timestamp: 0,
                    version: None,
                    settings: None,
                    agreements: None,
                },
                valid: false,
            },
        ]
    );

    test_validate_on_deserialize!(
        AddUserCredentialRequest,
        vec![
            TestVector {
                description: "AddUserCredentialRequest with credential_type too long",
                input: AddUserCredentialRequest {
                    credential_jwt: "1".repeat(10),
                    credential_spec: CredentialSpec {
                        credential_type: "1"
                            .repeat(AddUserCredentialRequest::MAX_CREDENTIAL_TYPE_LENGTH + 1),
                        arguments: None,
                    },
                    issuer_canister_id: Principal::anonymous(),
                    current_user_version: None,
                },
                valid: false,
            },
            TestVector {
                description: "AddUserCredentialRequest with too many arguments",
                input: AddUserCredentialRequest {
                    credential_jwt: "1".repeat(10),
                    credential_spec: CredentialSpec {
                        credential_type: "1"
                            .repeat(AddUserCredentialRequest::MAX_CREDENTIAL_TYPE_LENGTH),
                        arguments: Some({
                            let mut args = HashMap::new();
                            for i in 0..AddUserCredentialRequest::MAX_CREDENTIAL_SPEC_ARGUMENTS + 1
                            {
                                args.insert(i.to_string(), ArgumentValue::Int(i as i32));
                            }
                            args
                        }),
                    },
                    issuer_canister_id: Principal::anonymous(),
                    current_user_version: None,
                },
                valid: false,
            },
            TestVector {
                description: "AddUserCredentialRequest with argument key too long",
                input: AddUserCredentialRequest {
                    credential_jwt: "1".repeat(10),
                    credential_spec: CredentialSpec {
                        credential_type: "1"
                            .repeat(AddUserCredentialRequest::MAX_CREDENTIAL_TYPE_LENGTH),
                        arguments: Some({
                            let mut args = HashMap::new();
                            args.insert("1".repeat(AddUserCredentialRequest::MAX_CREDENTIAL_SPEC_ARGUMENT_KEY_LENGTH + 1), ArgumentValue::Int(0));
                            args
                        }),
                    },
                    issuer_canister_id: Principal::anonymous(),
                    current_user_version: None,
                },
                valid: false,
            },
            TestVector {
                description: "AddUserCredentialRequest with argument value too long",
                input: AddUserCredentialRequest {
                    credential_jwt: "1".repeat(10),
                    credential_spec: CredentialSpec {
                        credential_type: "1"
                            .repeat(AddUserCredentialRequest::MAX_CREDENTIAL_TYPE_LENGTH),
                        arguments: Some({
                            let mut args = HashMap::new();
                            args.insert("1".repeat(AddUserCredentialRequest::MAX_CREDENTIAL_SPEC_ARGUMENT_KEY_LENGTH), ArgumentValue::String("1".repeat(AddUserCredentialRequest::MAX_CREDENTIAL_SPEC_ARGUMENT_VALUE_LENGTH + 1)));
                            args
                        }),
                    },
                    issuer_canister_id: Principal::anonymous(),
                    current_user_version: None,
                },
                valid: false,
            },
        ]
    );
}
