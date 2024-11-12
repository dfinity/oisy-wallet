//! Tests the ledger account logic.

use crate::utils::pocketic::pic_canister::PicCanisterTrait;
use crate::utils::{mock::VC_HOLDER, pocketic::setup};
use candid::Principal;
use shared::types::signer::topup::TopUpCyclesLedgerResponse;

#[test]
fn test_topup_cannot_be_called_if_not_allowed() {
    let pic_setup = setup();
    // A random unauthorized user.
    let caller = Principal::from_text(VC_HOLDER).unwrap();

    let response =
        pic_setup.update::<TopUpCyclesLedgerResponse>(caller, "top_up_cycles_ledger", ());

    assert!(response.is_err(),);
}
