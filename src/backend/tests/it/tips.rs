//! End-to-end tests for tips, against a **real** ICRC-1/2 ledger.
//!
//! A mock would not be worth writing here: every guarantee this feature makes is
//! a guarantee about what a real ledger does with an allowance — that a spender
//! subaccount scopes it, that the fee comes out of it rather than out of the
//! payout, and that a revoked allowance turns a claim into a refusal instead of
//! a loss. These tests spend as few `setup()` calls as possible (each spins up a
//! full pocket-ic instance) and group assertions per flow, the same way
//! `personal_note_shares.rs` does.

use std::time::Duration;

use candid::{Nat, Principal};
use pretty_assertions::assert_eq;
use serde_bytes::ByteBuf;
use sha2::{Digest, Sha256};
use shared::types::{
    result_types::{CancelTipResult, GetTipSecretResult, SetTipSecretResult},
    tip::{
        CreateTipRequest, MyTip, PublicTip, SetTipSecretRequest, TipClaim, TipClaimRequest,
        TipDetails, TipError, TipStatus,
    },
};

use crate::utils::{
    icrc1_ledger::{self, Account as LedgerAccount, TRANSFER_FEE},
    pocketic::{controller, setup, PicBackend, PicCanisterTrait},
};

// -------------------------------------------------------------------------------------------------
// - Helpers
// -------------------------------------------------------------------------------------------------

const ONE_HOUR_NS: u64 = 60 * 60 * 1_000_000_000;
const TIP_AMOUNT: u64 = 500_000;
const SENDER_BALANCE: u64 = 100_000_000;

fn now_ns(pic_setup: &PicBackend) -> u64 {
    pic_setup.pic.get_time().as_nanos_since_unix_epoch()
}

/// The tip's spender subaccount, derived here **independently** of the canister.
/// If the backend ever changed how it derives this, the allowance the test
/// grants would stop matching the one the backend spends from, and every claim
/// would fail — which is the point of computing it separately.
fn spender_subaccount(tip_id: &str) -> Vec<u8> {
    Sha256::digest(tip_id.as_bytes()).to_vec()
}

fn claim_code_hash(claim_code: &str) -> ByteBuf {
    ByteBuf::from(Sha256::digest(claim_code.as_bytes()).to_vec())
}

struct TipEnv {
    pic_setup: PicBackend,
    ledger: Principal,
    sender: Principal,
}

fn setup_tips() -> TipEnv {
    let pic_setup = setup();
    let sender = Principal::self_authenticating("tip-sender");
    let ledger = icrc1_ledger::deploy(&pic_setup.pic, controller(), &[(sender, SENDER_BALANCE)]);
    pic_setup.ensure_user_profile(sender);
    TipEnv {
        pic_setup,
        ledger,
        sender,
    }
}

impl TipEnv {
    /// Grants the backend an allowance for this tip, sized the way the client
    /// will size it: the payout **plus** one ledger fee, since the ledger draws
    /// its fee from the allowance rather than from the amount.
    fn approve(&self, tip_id: &str, amount: u64, expires_at_ns: Option<u64>) {
        icrc1_ledger::approve(
            &self.pic_setup.pic,
            self.ledger,
            self.sender,
            LedgerAccount::with_subaccount(
                self.pic_setup.canister_id(),
                spender_subaccount(tip_id),
            ),
            amount,
            expires_at_ns,
        )
        .expect("approve should succeed");
    }

    fn create(
        &self,
        tip_id: &str,
        claim_code: &str,
        amount: u64,
        expires_at_ns: u64,
    ) -> Result<(), TipError> {
        self.pic_setup
            .update::<Result<(), TipError>>(
                self.sender,
                "create_tip",
                CreateTipRequest {
                    tip_id: tip_id.to_string(),
                    ledger_canister_id: self.ledger,
                    amount: Nat::from(amount),
                    expires_at_ns,
                    message: Some("thanks for the help".to_string()),
                    claim_code_hash: claim_code_hash(claim_code),
                },
            )
            .expect("create_tip should reach the handler")
    }

    /// Approve and create in one step — the pairing every real client performs.
    fn reserve(&self, tip_id: &str, claim_code: &str, amount: u64) -> u64 {
        let expires_at_ns = now_ns(&self.pic_setup) + ONE_HOUR_NS;
        self.approve(tip_id, amount + TRANSFER_FEE, Some(expires_at_ns));
        assert_eq!(
            self.create(tip_id, claim_code, amount, expires_at_ns),
            Ok(())
        );
        expires_at_ns
    }

    fn claim(
        &self,
        claimer: Principal,
        tip_id: &str,
        claim_code: &str,
    ) -> Result<TipClaim, TipError> {
        self.pic_setup
            .update::<Result<TipClaim, TipError>>(
                claimer,
                "claim_tip",
                TipClaimRequest {
                    tip_id: tip_id.to_string(),
                    claim_code: claim_code.to_string(),
                },
            )
            .expect("claim_tip should reach the handler")
    }

    fn public_tip(&self, caller: Principal, tip_id: &str) -> Result<PublicTip, TipError> {
        self.pic_setup
            .query::<Result<PublicTip, TipError>>(caller, "get_tip", tip_id.to_string())
            .expect("get_tip should reach the handler")
    }

    fn details(
        &self,
        caller: Principal,
        tip_id: &str,
        claim_code: &str,
    ) -> Result<TipDetails, TipError> {
        self.pic_setup
            .query::<Result<TipDetails, TipError>>(
                caller,
                "get_tip_details",
                TipClaimRequest {
                    tip_id: tip_id.to_string(),
                    claim_code: claim_code.to_string(),
                },
            )
            .expect("get_tip_details should reach the handler")
    }

    fn my_tips(&self, caller: Principal) -> Vec<MyTip> {
        self.pic_setup
            .query::<Result<Vec<MyTip>, TipError>>(caller, "get_my_tips", ())
            .expect("get_my_tips should reach the handler")
            .expect("get_my_tips should succeed")
    }

    fn cancel(&self, caller: Principal, tip_id: &str) -> Result<(), TipError> {
        self.pic_setup
            .update::<Result<(), TipError>>(caller, "cancel_tip", tip_id.to_string())
            .expect("cancel_tip should reach the handler")
    }

    fn balance(&self, owner: Principal) -> Nat {
        icrc1_ledger::balance_of(&self.pic_setup.pic, self.ledger, owner)
    }

    fn tip_allowance(&self, tip_id: &str) -> Nat {
        icrc1_ledger::allowance(
            &self.pic_setup.pic,
            self.ledger,
            self.sender,
            LedgerAccount::with_subaccount(
                self.pic_setup.canister_id(),
                spender_subaccount(tip_id),
            ),
        )
        .allowance
    }
}

// -------------------------------------------------------------------------------------------------
// - Tests
// -------------------------------------------------------------------------------------------------

#[test]
fn a_tip_pays_a_brand_new_principal_exactly_once_and_takes_no_custody() {
    let env = setup_tips();
    let tip_id = "tip-happy";
    let code = "claim-code-happy";

    let sender_balance_before = env.balance(env.sender);
    env.reserve(tip_id, code, TIP_AMOUNT);

    // Nothing has moved: the only ledger transaction so far is the approve,
    // which costs the sender one fee and leaves the tip amount in their account.
    assert_eq!(
        env.balance(env.sender),
        sender_balance_before.clone() - Nat::from(TRANSFER_FEE),
        "creating a tip must not transfer the amount anywhere"
    );

    // The anonymous preview carries the amount but nothing about anyone.
    let preview = env
        .public_tip(Principal::anonymous(), tip_id)
        .expect("an anonymous reader can see a live tip");
    assert_eq!(preview.amount, Nat::from(TIP_AMOUNT));
    assert_eq!(preview.ledger_canister_id, env.ledger);

    // A claimer who has never used OISY — no user profile at all — is exactly
    // who this feature is for.
    let claimer = Principal::self_authenticating("never-seen-before");
    let details = env
        .details(claimer, tip_id, code)
        .expect("a signed-in claimer sees the review");
    assert_eq!(details.message, Some("thanks for the help".to_string()));

    let claim = env
        .claim(claimer, tip_id, code)
        .expect("the claim succeeds");
    assert_eq!(claim.amount, Nat::from(TIP_AMOUNT));

    assert_eq!(
        env.balance(claimer),
        Nat::from(TIP_AMOUNT),
        "the claimer receives the full amount: the ledger charges its fee to the allowance"
    );
    assert_eq!(
        env.balance(env.sender),
        sender_balance_before - Nat::from(2 * TRANSFER_FEE) - Nat::from(TIP_AMOUNT),
        "the sender carries both fees — one to reserve, one to move — and the claimer \
         carries none. `transfer_from` debits amount + fee from the sender's balance \
         while crediting the amount in full, which is exactly why the allowance has \
         to be sized at amount + fee."
    );
    assert_eq!(
        env.tip_allowance(tip_id),
        Nat::from(0u8),
        "the reservation is spent exactly: amount plus one fee"
    );

    // Claiming twice pays once. The second attempt is indistinguishable from a
    // tip that never existed.
    assert_eq!(
        env.claim(claimer, tip_id, code),
        Err(TipError::NotFound),
        "a claimed tip cannot be claimed again"
    );
    assert_eq!(env.balance(claimer), Nat::from(TIP_AMOUNT));

    let history = env.my_tips(env.sender);
    assert_eq!(history.len(), 1);
    assert_eq!(history[0].status, TipStatus::Claimed);
    assert_eq!(
        history[0].claimed_by,
        Some(claimer),
        "the sender learns who claimed, as the claim screen disclosed"
    );
}

#[test]
fn every_unclaimable_tip_looks_the_same_from_outside() {
    let env = setup_tips();
    let stranger = Principal::self_authenticating("stranger");

    // Unknown id.
    assert_eq!(
        env.claim(stranger, "no-such-tip", "whatever"),
        Err(TipError::NotFound)
    );
    assert_eq!(
        env.public_tip(Principal::anonymous(), "no-such-tip"),
        Err(TipError::NotFound)
    );

    // A wrong claim code is refused, and — importantly — does not consume the
    // tip: the right code still works afterwards.
    let guessed = "tip-guessed";
    env.reserve(guessed, "the-real-code", TIP_AMOUNT);
    assert_eq!(
        env.claim(stranger, guessed, "not-the-code"),
        Err(TipError::NotFound),
        "a wrong code is indistinguishable from a missing tip"
    );
    assert_eq!(
        env.details(stranger, guessed, "not-the-code"),
        Err(TipError::NotFound),
        "and it does not reveal the message either"
    );
    assert!(env.claim(stranger, guessed, "the-real-code").is_ok());

    // Expiry: nothing is transferred, and History says so.
    let expiring = "tip-expiring";
    env.reserve(expiring, "code-expiring", TIP_AMOUNT);
    env.pic_setup.pic.advance_time(Duration::from_hours(2));
    let late = Principal::self_authenticating("late-claimer");
    assert_eq!(
        env.claim(late, expiring, "code-expiring"),
        Err(TipError::NotFound)
    );
    assert_eq!(
        env.balance(late),
        Nat::from(0u8),
        "an expired tip transfers nothing, to anyone"
    );
    let expired_row = env
        .my_tips(env.sender)
        .into_iter()
        .find(|tip| tip.tip_id == expiring)
        .expect("an expired tip stays in History");
    assert_eq!(expired_row.status, TipStatus::Expired);

    // Cancellation.
    let cancelled = "tip-cancelled";
    env.reserve(cancelled, "code-cancelled", TIP_AMOUNT);
    assert_eq!(env.cancel(env.sender, cancelled), Ok(()));
    assert_eq!(
        env.public_tip(Principal::anonymous(), cancelled),
        Err(TipError::NotFound)
    );
    assert_eq!(
        env.claim(stranger, cancelled, "code-cancelled"),
        Err(TipError::NotFound)
    );
    let cancelled_row = env
        .my_tips(env.sender)
        .into_iter()
        .find(|tip| tip.tip_id == cancelled)
        .expect("a cancelled tip stays in History");
    assert_eq!(cancelled_row.status, TipStatus::Cancelled);
}

#[test]
fn a_revoked_allowance_tells_the_claimer_and_leaves_the_tip_recoverable() {
    let env = setup_tips();
    let tip_id = "tip-uncovered";
    let code = "code-uncovered";
    let expires_at_ns = env.reserve(tip_id, code, TIP_AMOUNT);

    // The sender changes their mind at the ledger without telling us — the case
    // the whole "a tip is a reservation, not a guarantee" framing exists for.
    env.approve(tip_id, 0, None);

    let claimer = Principal::self_authenticating("unlucky-claimer");
    assert_eq!(
        env.claim(claimer, tip_id, code),
        Err(TipError::Uncovered),
        "the one failure a claimer is told the truth about"
    );
    assert_eq!(env.balance(claimer), Nat::from(0u8));

    // The failed claim did not consume the tip: it is still Reserved, so a
    // sender who re-approves makes it claimable again.
    let row = env
        .my_tips(env.sender)
        .into_iter()
        .find(|tip| tip.tip_id == tip_id)
        .expect("the tip is still on record");
    assert_eq!(row.status, TipStatus::Reserved);

    env.approve(tip_id, TIP_AMOUNT + TRANSFER_FEE, Some(expires_at_ns));
    assert!(
        env.claim(claimer, tip_id, code).is_ok(),
        "re-covering the tip makes the same link work again"
    );
    assert_eq!(env.balance(claimer), Nat::from(TIP_AMOUNT));
}

#[test]
fn only_the_sender_can_cancel_and_only_a_principal_can_claim() {
    let env = setup_tips();
    let tip_id = "tip-guards";
    let code = "code-guards";
    env.reserve(tip_id, code, TIP_AMOUNT);

    let someone_else = Principal::self_authenticating("not-the-sender");
    env.pic_setup.ensure_user_profile(someone_else);
    assert_eq!(
        env.cancel(someone_else, tip_id),
        Err(TipError::NotYourTip),
        "a tip is only its sender's to cancel"
    );

    // An anonymous caller has nowhere to receive tokens, so the guard rejects
    // the call outright rather than returning a `TipError`.
    assert!(
        env.pic_setup
            .update::<Result<TipClaim, TipError>>(
                Principal::anonymous(),
                "claim_tip",
                TipClaimRequest {
                    tip_id: tip_id.to_string(),
                    claim_code: code.to_string(),
                },
            )
            .is_err(),
        "claiming anonymously is rejected by the guard"
    );

    // Reading the tip anonymously, however, is the whole point.
    assert!(env.public_tip(Principal::anonymous(), tip_id).is_ok());
}

#[test]
fn a_tip_below_one_ledger_fee_is_refused() {
    let env = setup_tips();
    let tip_id = "tip-dust";
    let expires_at_ns = now_ns(&env.pic_setup) + ONE_HOUR_NS;
    env.approve(tip_id, TRANSFER_FEE * 10, Some(expires_at_ns));

    assert_eq!(
        env.create(tip_id, "code-dust", TRANSFER_FEE - 1, expires_at_ns),
        Err(TipError::AmountTooSmall),
        "a tip that cannot cover the cost of moving it is spam by construction"
    );
}

#[test]
fn a_tip_without_a_covering_allowance_is_refused_at_creation() {
    let env = setup_tips();
    let tip_id = "tip-underfunded";
    let expires_at_ns = now_ns(&env.pic_setup) + ONE_HOUR_NS;

    // One fee short of what the payout needs.
    env.approve(tip_id, TIP_AMOUNT, Some(expires_at_ns));
    assert_eq!(
        env.create(tip_id, "code-underfunded", TIP_AMOUNT, expires_at_ns),
        Err(TipError::Uncovered),
        "the allowance must cover the amount plus the fee the ledger draws from it"
    );

    // And a reservation that lapses before the tip does is refused too: it would
    // advertise a deadline the ledger will not honour.
    let short_lived = "tip-short-allowance";
    env.approve(
        short_lived,
        TIP_AMOUNT + TRANSFER_FEE,
        Some(expires_at_ns - ONE_HOUR_NS / 2),
    );
    assert_eq!(
        env.create(short_lived, "code-short", TIP_AMOUNT, expires_at_ns),
        Err(TipError::InvalidExpiry)
    );
}

#[test]
fn a_stored_claim_code_is_readable_only_by_the_sender_who_stored_it() {
    // The recovery store exists so a sender can get back to their own link. It
    // must not become a way to read anybody else's: `EncryptedMaps` keys every
    // map by its owner, and this pins that the isolation actually holds through
    // the endpoints rather than only in the library.
    let env = setup_tips();
    let tip_id = "tip-secret";
    env.reserve(tip_id, "claim-code-secret", TIP_AMOUNT);

    // Opaque bytes as far as the canister is concerned — in production this is
    // AES-GCM ciphertext under a vetKey only the sender can derive.
    let ciphertext = ByteBuf::from(vec![7u8; 48]);

    let stored: SetTipSecretResult = env
        .pic_setup
        .update(
            env.sender,
            "set_tip_secret",
            SetTipSecretRequest {
                tip_id: tip_id.to_string(),
                encrypted_claim_code: ciphertext.clone(),
            },
        )
        .expect("storing an encrypted claim code should succeed");
    assert!(matches!(stored, SetTipSecretResult::Ok));

    // The sender reads back exactly what they wrote.
    let mine: GetTipSecretResult = env
        .pic_setup
        .query(env.sender, "get_tip_secret", tip_id.to_string())
        .expect("the sender may read their own secret");
    assert_eq!(
        mine,
        GetTipSecretResult::Ok(Some(ciphertext)),
        "a sender must get their own ciphertext back verbatim"
    );

    // Anyone else asking for the same tip id sees an empty map of their own —
    // not the sender's ciphertext, and not an error that would confirm one
    // exists.
    let stranger = Principal::self_authenticating("tip-stranger");
    env.pic_setup.ensure_user_profile(stranger);
    let theirs: GetTipSecretResult = env
        .pic_setup
        .query(stranger, "get_tip_secret", tip_id.to_string())
        .expect("the query itself is allowed for any registered user");
    assert_eq!(
        theirs,
        GetTipSecretResult::Ok(None),
        "another principal must never see the sender's stored claim code"
    );
}

#[test]
fn cancelling_a_tip_drops_its_recoverable_claim_code() {
    // Once cancelled the link is worthless, so the recoverable copy should not
    // outlive it.
    let env = setup_tips();
    let tip_id = "tip-cancel-secret";
    env.reserve(tip_id, "claim-code-cancel", TIP_AMOUNT);

    let _: SetTipSecretResult = env
        .pic_setup
        .update(
            env.sender,
            "set_tip_secret",
            SetTipSecretRequest {
                tip_id: tip_id.to_string(),
                encrypted_claim_code: ByteBuf::from(vec![9u8; 32]),
            },
        )
        .expect("storing should succeed");

    let cancelled: CancelTipResult = env
        .pic_setup
        .update(env.sender, "cancel_tip", tip_id.to_string())
        .expect("the sender may cancel their own tip");
    assert!(matches!(cancelled, CancelTipResult::Ok(_)));

    let after: GetTipSecretResult = env
        .pic_setup
        .query(env.sender, "get_tip_secret", tip_id.to_string())
        .expect("the query still answers");
    assert_eq!(
        after,
        GetTipSecretResult::Ok(None),
        "cancelling must drop the stored claim code"
    );
}
