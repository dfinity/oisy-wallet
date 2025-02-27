//! Tests the ledger account logic.

use candid::Principal;
use shared::types::signer::topup::{
    TopUpCyclesLedgerError, TopUpCyclesLedgerRequest, TopUpCyclesLedgerResult, MAX_PERCENTAGE,
    MIN_PERCENTAGE,
};

use crate::utils::{
    mock::VC_HOLDER,
    pocketic::{controller, pic_canister::PicCanisterTrait, setup},
};

#[test]
fn test_topup_cannot_be_called_if_not_allowed() {
    let pic_setup = setup();
    // A random unauthorized user.
    let caller = Principal::from_text(VC_HOLDER).unwrap();

    let response = pic_setup.update::<TopUpCyclesLedgerResult>(caller, "top_up_cycles_ledger", ());

    assert_eq!(response, Err("Caller is not allowed.".to_string()));
}

#[test]
fn test_topup_fails_for_percentage_out_of_bounds() {
    let pic_setup = setup();
    // A random unauthorized user.
    let caller = controller();

    for percentage in [MIN_PERCENTAGE - 1, MAX_PERCENTAGE + 1].into_iter() {
        let response = pic_setup.update::<TopUpCyclesLedgerResult>(
            caller,
            "top_up_cycles_ledger",
            Some(TopUpCyclesLedgerRequest {
                threshold: None,
                percentage: Some(percentage),
            }),
        );

        assert_eq!(
            response,
            Ok(Err(
                TopUpCyclesLedgerError::InvalidArgPercentageOutOfRange {
                    percentage,
                    min: MIN_PERCENTAGE,
                    max: MAX_PERCENTAGE
                }
            ))
        );
    }
}
