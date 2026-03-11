// This is an experimental feature to generate Rust binding from Candid.
// You may want to manually adjust some of the types.
#![allow(dead_code, unused_imports, clippy::missing_errors_doc)]
use candid::{self, CandidType, Deserialize, Principal};
use ic_cdk::call::{Call, CallResult as Result};
pub use ic_cycles_ledger_types::*;

pub struct CyclesLedgerService(pub Principal);
impl CyclesLedgerService {
    pub async fn create_canister(
        &self,
        arg0: &CreateCanisterArgs,
    ) -> Result<(std::result::Result<CreateCanisterSuccess, CreateCanisterError>,)> {
        Ok(Call::bounded_wait(self.0, "create_canister")
            .with_args(&(arg0,))
            .await?
            .candid_tuple()?)
    }

    pub async fn create_canister_from(
        &self,
        arg0: &CreateCanisterFromArgs,
    ) -> Result<(std::result::Result<CreateCanisterSuccess, CreateCanisterFromError>,)> {
        Ok(Call::bounded_wait(self.0, "create_canister_from")
            .with_args(&(arg0,))
            .await?
            .candid_tuple()?)
    }

    pub async fn deposit(&self, arg0: &DepositArgs) -> Result<(DepositResult,)> {
        Ok(Call::bounded_wait(self.0, "deposit")
            .with_args(&(arg0,))
            .await?
            .candid_tuple()?)
    }

    pub async fn http_request(&self, arg0: &HttpRequest) -> Result<(HttpResponse,)> {
        Ok(Call::bounded_wait(self.0, "http_request")
            .with_args(&(arg0,))
            .await?
            .candid_tuple()?)
    }

    pub async fn icrc_1_balance_of(&self, arg0: &Account) -> Result<(candid::Nat,)> {
        Ok(Call::bounded_wait(self.0, "icrc1_balance_of")
            .with_args(&(arg0,))
            .await?
            .candid_tuple()?)
    }

    pub async fn icrc_1_decimals(&self) -> Result<(u8,)> {
        Ok(Call::bounded_wait(self.0, "icrc1_decimals")
            .await?
            .candid_tuple()?)
    }

    pub async fn icrc_1_fee(&self) -> Result<(candid::Nat,)> {
        Ok(Call::bounded_wait(self.0, "icrc1_fee")
            .await?
            .candid_tuple()?)
    }

    pub async fn icrc_1_metadata(&self) -> Result<(Vec<(String, MetadataValue)>,)> {
        Ok(Call::bounded_wait(self.0, "icrc1_metadata")
            .await?
            .candid_tuple()?)
    }

    pub async fn icrc_1_minting_account(&self) -> Result<(Option<Account>,)> {
        Ok(Call::bounded_wait(self.0, "icrc1_minting_account")
            .await?
            .candid_tuple()?)
    }

    pub async fn icrc_1_name(&self) -> Result<(String,)> {
        Ok(Call::bounded_wait(self.0, "icrc1_name")
            .await?
            .candid_tuple()?)
    }

    pub async fn icrc_1_supported_standards(&self) -> Result<(Vec<SupportedStandard>,)> {
        Ok(Call::bounded_wait(self.0, "icrc1_supported_standards")
            .await?
            .candid_tuple()?)
    }

    pub async fn icrc_1_symbol(&self) -> Result<(String,)> {
        Ok(Call::bounded_wait(self.0, "icrc1_symbol")
            .await?
            .candid_tuple()?)
    }

    pub async fn icrc_1_total_supply(&self) -> Result<(candid::Nat,)> {
        Ok(Call::bounded_wait(self.0, "icrc1_total_supply")
            .await?
            .candid_tuple()?)
    }

    pub async fn icrc_1_transfer(
        &self,
        arg0: &TransferArgs,
    ) -> Result<(std::result::Result<BlockIndex, TransferError>,)> {
        Ok(Call::bounded_wait(self.0, "icrc1_transfer")
            .with_args(&(arg0,))
            .await?
            .candid_tuple()?)
    }

    pub async fn icrc_2_allowance(&self, arg0: &AllowanceArgs) -> Result<(Allowance,)> {
        Ok(Call::bounded_wait(self.0, "icrc2_allowance")
            .with_args(&(arg0,))
            .await?
            .candid_tuple()?)
    }

    pub async fn icrc_2_approve(
        &self,
        arg0: &ApproveArgs,
    ) -> Result<(std::result::Result<candid::Nat, ApproveError>,)> {
        Ok(Call::bounded_wait(self.0, "icrc2_approve")
            .with_args(&(arg0,))
            .await?
            .candid_tuple()?)
    }

    pub async fn icrc_2_transfer_from(
        &self,
        arg0: &TransferFromArgs,
    ) -> Result<(std::result::Result<candid::Nat, TransferFromError>,)> {
        Ok(Call::bounded_wait(self.0, "icrc2_transfer_from")
            .with_args(&(arg0,))
            .await?
            .candid_tuple()?)
    }

    pub async fn icrc_3_get_archives(
        &self,
        arg0: &GetArchivesArgs,
    ) -> Result<(GetArchivesResult,)> {
        Ok(Call::bounded_wait(self.0, "icrc3_get_archives")
            .with_args(&(arg0,))
            .await?
            .candid_tuple()?)
    }

    pub async fn icrc_3_get_blocks(&self, arg0: &GetBlocksArgs) -> Result<(GetBlocksResult,)> {
        Ok(Call::bounded_wait(self.0, "icrc3_get_blocks")
            .with_args(&(arg0,))
            .await?
            .candid_tuple()?)
    }

    pub async fn icrc_3_get_tip_certificate(&self) -> Result<(Option<DataCertificate>,)> {
        Ok(Call::bounded_wait(self.0, "icrc3_get_tip_certificate")
            .await?
            .candid_tuple()?)
    }

    pub async fn icrc_3_supported_block_types(&self) -> Result<(Vec<SupportedBlockType>,)> {
        Ok(Call::bounded_wait(self.0, "icrc3_supported_block_types")
            .await?
            .candid_tuple()?)
    }

    pub async fn withdraw(
        &self,
        arg0: &WithdrawArgs,
    ) -> Result<(std::result::Result<BlockIndex, WithdrawError>,)> {
        Ok(Call::bounded_wait(self.0, "withdraw")
            .with_args(&(arg0,))
            .await?
            .candid_tuple()?)
    }

    pub async fn withdraw_from(
        &self,
        arg0: &WithdrawFromArgs,
    ) -> Result<(std::result::Result<BlockIndex, WithdrawFromError>,)> {
        Ok(Call::bounded_wait(self.0, "withdraw_from")
            .with_args(&(arg0,))
            .await?
            .candid_tuple()?)
    }
}
