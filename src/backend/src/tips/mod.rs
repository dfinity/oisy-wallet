//! Sending a tip via a link or QR code.
//!
//! The canister never holds the tokens. A tip is an ICRC-2 allowance the sender
//! grants to this canister under a **per-tip spender subaccount**, so the funds
//! stay in the sender's own account and an unclaimed tip lapses on the ledger
//! with nothing to refund. The per-tip subaccount is what keeps tips isolated:
//! an allowance granted for one tip is unusable for any other, even though
//! every tip shares this canister as the spender. See
//! `docs/ai/spec-driven-development/specs/2026-08-05-feat-tips-via-link.md`.

pub mod icrc2;
pub mod model;
pub mod service;
