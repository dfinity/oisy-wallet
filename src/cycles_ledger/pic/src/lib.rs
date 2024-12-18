//! Bindings to the `cycles_ledger` canister, generated by `./scripts/bind/rust.sh`
//!
//! Binding configuration: `./scripts/bind/rust/cycles_ledger.pic.toml`
//!
//! Adapted from: <https://github.com/dfinity/candid/blob/master/rust/candid_parser/src/bindings/rust_call.hbs>
#![allow(dead_code, unused_imports, clippy::all, clippy::missing_errors_doc)]
use std::sync::Arc;

use candid::{self, decode_args, encode_args, CandidType, Deserialize, Principal};
use pocket_ic::{PocketIc, WasmResult};

pub use ic_cycles_ledger_types::*;

pub struct CyclesLedgerPic {
    pub pic: Arc<PocketIc>,
    pub canister_id: Principal,
}

impl CyclesLedgerPic {
    pub fn create_canister(
        &self,
        caller: Principal,
        arg0: &CreateCanisterArgs,
    ) -> Result<(std::result::Result<CreateCanisterSuccess, CreateCanisterError>,), String> {
        let args = encode_args((arg0,)).expect("Failed to encode update call arguments");
        self.pic
            .update_call(self.canister_id, caller, "create_canister", args)
            .map_err(|e| {
                format!(
                    "Update call error. RejectionCode: {:?}, Error: {}",
                    e.code, e.description
                )
            })
            .and_then(|reply| match reply {
                WasmResult::Reply(reply) => {
                    decode_args(&reply).map_err(|e| format!("Decoding failed: {e}"))
                }
                WasmResult::Reject(error) => Err(error),
            })
    }
    pub fn create_canister_from(
        &self,
        caller: Principal,
        arg0: &CreateCanisterFromArgs,
    ) -> Result<(std::result::Result<CreateCanisterSuccess, CreateCanisterFromError>,), String>
    {
        let args = encode_args((arg0,)).expect("Failed to encode update call arguments");
        self.pic
            .update_call(self.canister_id, caller, "create_canister", args)
            .map_err(|e| {
                format!(
                    "Update call error. RejectionCode: {:?}, Error: {}",
                    e.code, e.description
                )
            })
            .and_then(|reply| match reply {
                WasmResult::Reply(reply) => {
                    decode_args(&reply).map_err(|e| format!("Decoding failed: {e}"))
                }
                WasmResult::Reject(error) => Err(error),
            })
    }
    pub fn deposit(
        &self,
        caller: Principal,
        arg0: &DepositArgs,
    ) -> Result<(DepositResult,), String> {
        let args = encode_args((arg0,)).expect("Failed to encode update call arguments");
        self.pic
            .update_call(self.canister_id, caller, "create_canister", args)
            .map_err(|e| {
                format!(
                    "Update call error. RejectionCode: {:?}, Error: {}",
                    e.code, e.description
                )
            })
            .and_then(|reply| match reply {
                WasmResult::Reply(reply) => {
                    decode_args(&reply).map_err(|e| format!("Decoding failed: {e}"))
                }
                WasmResult::Reject(error) => Err(error),
            })
    }
    pub fn http_request(
        &self,
        caller: Principal,
        arg0: &HttpRequest,
    ) -> Result<(HttpResponse,), String> {
        let args = encode_args((arg0,)).expect("Failed to encode update call arguments");
        self.pic
            .update_call(self.canister_id, caller, "create_canister", args)
            .map_err(|e| {
                format!(
                    "Update call error. RejectionCode: {:?}, Error: {}",
                    e.code, e.description
                )
            })
            .and_then(|reply| match reply {
                WasmResult::Reply(reply) => {
                    decode_args(&reply).map_err(|e| format!("Decoding failed: {e}"))
                }
                WasmResult::Reject(error) => Err(error),
            })
    }
    pub fn icrc_1_balance_of(
        &self,
        caller: Principal,
        arg0: &Account,
    ) -> Result<(candid::Nat,), String> {
        let args = encode_args((arg0,)).expect("Failed to encode update call arguments");
        self.pic
            .update_call(self.canister_id, caller, "create_canister", args)
            .map_err(|e| {
                format!(
                    "Update call error. RejectionCode: {:?}, Error: {}",
                    e.code, e.description
                )
            })
            .and_then(|reply| match reply {
                WasmResult::Reply(reply) => {
                    decode_args(&reply).map_err(|e| format!("Decoding failed: {e}"))
                }
                WasmResult::Reject(error) => Err(error),
            })
    }
    pub fn icrc_1_decimals(&self, caller: Principal) -> Result<(u8,), String> {
        let args = encode_args(()).expect("Failed to encode update call arguments");
        self.pic
            .update_call(self.canister_id, caller, "create_canister", args)
            .map_err(|e| {
                format!(
                    "Update call error. RejectionCode: {:?}, Error: {}",
                    e.code, e.description
                )
            })
            .and_then(|reply| match reply {
                WasmResult::Reply(reply) => {
                    decode_args(&reply).map_err(|e| format!("Decoding failed: {e}"))
                }
                WasmResult::Reject(error) => Err(error),
            })
    }
    pub fn icrc_1_fee(&self, caller: Principal) -> Result<(candid::Nat,), String> {
        let args = encode_args(()).expect("Failed to encode update call arguments");
        self.pic
            .update_call(self.canister_id, caller, "create_canister", args)
            .map_err(|e| {
                format!(
                    "Update call error. RejectionCode: {:?}, Error: {}",
                    e.code, e.description
                )
            })
            .and_then(|reply| match reply {
                WasmResult::Reply(reply) => {
                    decode_args(&reply).map_err(|e| format!("Decoding failed: {e}"))
                }
                WasmResult::Reject(error) => Err(error),
            })
    }
    pub fn icrc_1_metadata(
        &self,
        caller: Principal,
    ) -> Result<(Vec<(String, MetadataValue)>,), String> {
        let args = encode_args(()).expect("Failed to encode update call arguments");
        self.pic
            .update_call(self.canister_id, caller, "create_canister", args)
            .map_err(|e| {
                format!(
                    "Update call error. RejectionCode: {:?}, Error: {}",
                    e.code, e.description
                )
            })
            .and_then(|reply| match reply {
                WasmResult::Reply(reply) => {
                    decode_args(&reply).map_err(|e| format!("Decoding failed: {e}"))
                }
                WasmResult::Reject(error) => Err(error),
            })
    }
    pub fn icrc_1_minting_account(&self, caller: Principal) -> Result<(Option<Account>,), String> {
        let args = encode_args(()).expect("Failed to encode update call arguments");
        self.pic
            .update_call(self.canister_id, caller, "create_canister", args)
            .map_err(|e| {
                format!(
                    "Update call error. RejectionCode: {:?}, Error: {}",
                    e.code, e.description
                )
            })
            .and_then(|reply| match reply {
                WasmResult::Reply(reply) => {
                    decode_args(&reply).map_err(|e| format!("Decoding failed: {e}"))
                }
                WasmResult::Reject(error) => Err(error),
            })
    }
    pub fn icrc_1_name(&self, caller: Principal) -> Result<(String,), String> {
        let args = encode_args(()).expect("Failed to encode update call arguments");
        self.pic
            .update_call(self.canister_id, caller, "create_canister", args)
            .map_err(|e| {
                format!(
                    "Update call error. RejectionCode: {:?}, Error: {}",
                    e.code, e.description
                )
            })
            .and_then(|reply| match reply {
                WasmResult::Reply(reply) => {
                    decode_args(&reply).map_err(|e| format!("Decoding failed: {e}"))
                }
                WasmResult::Reject(error) => Err(error),
            })
    }
    pub fn icrc_1_supported_standards(
        &self,
        caller: Principal,
    ) -> Result<(Vec<SupportedStandard>,), String> {
        let args = encode_args(()).expect("Failed to encode update call arguments");
        self.pic
            .update_call(self.canister_id, caller, "create_canister", args)
            .map_err(|e| {
                format!(
                    "Update call error. RejectionCode: {:?}, Error: {}",
                    e.code, e.description
                )
            })
            .and_then(|reply| match reply {
                WasmResult::Reply(reply) => {
                    decode_args(&reply).map_err(|e| format!("Decoding failed: {e}"))
                }
                WasmResult::Reject(error) => Err(error),
            })
    }
    pub fn icrc_1_symbol(&self, caller: Principal) -> Result<(String,), String> {
        let args = encode_args(()).expect("Failed to encode update call arguments");
        self.pic
            .update_call(self.canister_id, caller, "create_canister", args)
            .map_err(|e| {
                format!(
                    "Update call error. RejectionCode: {:?}, Error: {}",
                    e.code, e.description
                )
            })
            .and_then(|reply| match reply {
                WasmResult::Reply(reply) => {
                    decode_args(&reply).map_err(|e| format!("Decoding failed: {e}"))
                }
                WasmResult::Reject(error) => Err(error),
            })
    }
    pub fn icrc_1_total_supply(&self, caller: Principal) -> Result<(candid::Nat,), String> {
        let args = encode_args(()).expect("Failed to encode update call arguments");
        self.pic
            .update_call(self.canister_id, caller, "create_canister", args)
            .map_err(|e| {
                format!(
                    "Update call error. RejectionCode: {:?}, Error: {}",
                    e.code, e.description
                )
            })
            .and_then(|reply| match reply {
                WasmResult::Reply(reply) => {
                    decode_args(&reply).map_err(|e| format!("Decoding failed: {e}"))
                }
                WasmResult::Reject(error) => Err(error),
            })
    }
    pub fn icrc_1_transfer(
        &self,
        caller: Principal,
        arg0: &TransferArgs,
    ) -> Result<(std::result::Result<BlockIndex, TransferError>,), String> {
        let args = encode_args((arg0,)).expect("Failed to encode update call arguments");
        self.pic
            .update_call(self.canister_id, caller, "create_canister", args)
            .map_err(|e| {
                format!(
                    "Update call error. RejectionCode: {:?}, Error: {}",
                    e.code, e.description
                )
            })
            .and_then(|reply| match reply {
                WasmResult::Reply(reply) => {
                    decode_args(&reply).map_err(|e| format!("Decoding failed: {e}"))
                }
                WasmResult::Reject(error) => Err(error),
            })
    }
    pub fn icrc_2_allowance(
        &self,
        caller: Principal,
        arg0: &AllowanceArgs,
    ) -> Result<(Allowance,), String> {
        let args = encode_args((arg0,)).expect("Failed to encode update call arguments");
        self.pic
            .update_call(self.canister_id, caller, "create_canister", args)
            .map_err(|e| {
                format!(
                    "Update call error. RejectionCode: {:?}, Error: {}",
                    e.code, e.description
                )
            })
            .and_then(|reply| match reply {
                WasmResult::Reply(reply) => {
                    decode_args(&reply).map_err(|e| format!("Decoding failed: {e}"))
                }
                WasmResult::Reject(error) => Err(error),
            })
    }
    pub fn icrc_2_approve(
        &self,
        caller: Principal,
        arg0: &ApproveArgs,
    ) -> Result<(std::result::Result<candid::Nat, ApproveError>,), String> {
        let args = encode_args((arg0,)).expect("Failed to encode update call arguments");
        self.pic
            .update_call(self.canister_id, caller, "create_canister", args)
            .map_err(|e| {
                format!(
                    "Update call error. RejectionCode: {:?}, Error: {}",
                    e.code, e.description
                )
            })
            .and_then(|reply| match reply {
                WasmResult::Reply(reply) => {
                    decode_args(&reply).map_err(|e| format!("Decoding failed: {e}"))
                }
                WasmResult::Reject(error) => Err(error),
            })
    }
    pub fn icrc_2_transfer_from(
        &self,
        caller: Principal,
        arg0: &TransferFromArgs,
    ) -> Result<(std::result::Result<candid::Nat, TransferFromError>,), String> {
        let args = encode_args((arg0,)).expect("Failed to encode update call arguments");
        self.pic
            .update_call(self.canister_id, caller, "create_canister", args)
            .map_err(|e| {
                format!(
                    "Update call error. RejectionCode: {:?}, Error: {}",
                    e.code, e.description
                )
            })
            .and_then(|reply| match reply {
                WasmResult::Reply(reply) => {
                    decode_args(&reply).map_err(|e| format!("Decoding failed: {e}"))
                }
                WasmResult::Reject(error) => Err(error),
            })
    }
    pub fn icrc_3_get_archives(
        &self,
        caller: Principal,
        arg0: &GetArchivesArgs,
    ) -> Result<(GetArchivesResult,), String> {
        let args = encode_args((arg0,)).expect("Failed to encode update call arguments");
        self.pic
            .update_call(self.canister_id, caller, "create_canister", args)
            .map_err(|e| {
                format!(
                    "Update call error. RejectionCode: {:?}, Error: {}",
                    e.code, e.description
                )
            })
            .and_then(|reply| match reply {
                WasmResult::Reply(reply) => {
                    decode_args(&reply).map_err(|e| format!("Decoding failed: {e}"))
                }
                WasmResult::Reject(error) => Err(error),
            })
    }
    pub fn icrc_3_get_blocks(
        &self,
        caller: Principal,
        arg0: &GetBlocksArgs,
    ) -> Result<(GetBlocksResult,), String> {
        let args = encode_args((arg0,)).expect("Failed to encode update call arguments");
        self.pic
            .update_call(self.canister_id, caller, "create_canister", args)
            .map_err(|e| {
                format!(
                    "Update call error. RejectionCode: {:?}, Error: {}",
                    e.code, e.description
                )
            })
            .and_then(|reply| match reply {
                WasmResult::Reply(reply) => {
                    decode_args(&reply).map_err(|e| format!("Decoding failed: {e}"))
                }
                WasmResult::Reject(error) => Err(error),
            })
    }
    pub fn icrc_3_get_tip_certificate(
        &self,
        caller: Principal,
    ) -> Result<(Option<DataCertificate>,), String> {
        let args = encode_args(()).expect("Failed to encode update call arguments");
        self.pic
            .update_call(self.canister_id, caller, "create_canister", args)
            .map_err(|e| {
                format!(
                    "Update call error. RejectionCode: {:?}, Error: {}",
                    e.code, e.description
                )
            })
            .and_then(|reply| match reply {
                WasmResult::Reply(reply) => {
                    decode_args(&reply).map_err(|e| format!("Decoding failed: {e}"))
                }
                WasmResult::Reject(error) => Err(error),
            })
    }
    pub fn icrc_3_supported_block_types(
        &self,
        caller: Principal,
    ) -> Result<(Vec<SupportedBlockType>,), String> {
        let args = encode_args(()).expect("Failed to encode update call arguments");
        self.pic
            .update_call(self.canister_id, caller, "create_canister", args)
            .map_err(|e| {
                format!(
                    "Update call error. RejectionCode: {:?}, Error: {}",
                    e.code, e.description
                )
            })
            .and_then(|reply| match reply {
                WasmResult::Reply(reply) => {
                    decode_args(&reply).map_err(|e| format!("Decoding failed: {e}"))
                }
                WasmResult::Reject(error) => Err(error),
            })
    }
    pub fn withdraw(
        &self,
        caller: Principal,
        arg0: &WithdrawArgs,
    ) -> Result<(std::result::Result<BlockIndex, WithdrawError>,), String> {
        let args = encode_args((arg0,)).expect("Failed to encode update call arguments");
        self.pic
            .update_call(self.canister_id, caller, "create_canister", args)
            .map_err(|e| {
                format!(
                    "Update call error. RejectionCode: {:?}, Error: {}",
                    e.code, e.description
                )
            })
            .and_then(|reply| match reply {
                WasmResult::Reply(reply) => {
                    decode_args(&reply).map_err(|e| format!("Decoding failed: {e}"))
                }
                WasmResult::Reject(error) => Err(error),
            })
    }
    pub fn withdraw_from(
        &self,
        caller: Principal,
        arg0: &WithdrawFromArgs,
    ) -> Result<(std::result::Result<BlockIndex, WithdrawFromError>,), String> {
        let args = encode_args((arg0,)).expect("Failed to encode update call arguments");
        self.pic
            .update_call(self.canister_id, caller, "create_canister", args)
            .map_err(|e| {
                format!(
                    "Update call error. RejectionCode: {:?}, Error: {}",
                    e.code, e.description
                )
            })
            .and_then(|reply| match reply {
                WasmResult::Reply(reply) => {
                    decode_args(&reply).map_err(|e| format!("Decoding failed: {e}"))
                }
                WasmResult::Reject(error) => Err(error),
            })
    }
}