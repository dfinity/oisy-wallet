//! Tests for the types module.

mod custom_token {
    //! Tests for the custom_token module.
    use candid::{Decode, Encode};

    use super::super::custom_token::*;

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
    #[ignore] // This does NOT currently work for candid
    #[test]
    fn spl_token_validation_works_for_candid() {
        for (input, expected) in SPL_TEST_VECTORS.iter() {
            let spl_token_id = SplTokenId(input.to_string());

            let candid = Encode!(&spl_token_id).unwrap();
            let (result): Result<SplTokenId, _> = Decode!(&candid, SplTokenId);
            assert_eq!(*expected, result.is_ok());
        }
    }
}
