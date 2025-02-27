// This is an experimental feature to generate Rust binding from Candid.
// You may want to manually adjust some of the types.
#![allow(dead_code, unused_imports, clippy::missing_errors_doc)]
use candid::{self, CandidType, Deserialize, Principal};
use ic_cdk::api::call::CallResult as Result;
pub use ic_cycles_ledger_types::*;

pub struct CyclesLedgerService(pub Principal);
impl CyclesLedgerService {
    pub async fn create_canister(
        &self,
        arg0: &CreateCanisterArgs,
    ) -> Result<(std::result::Result<CreateCanisterSuccess, CreateCanisterError>,)> {
        ic_cdk::call(self.0, "create_canister", (arg0,)).await
    }

    pub async fn create_canister_from(
        &self,
        arg0: &CreateCanisterFromArgs,
    ) -> Result<(std::result::Result<CreateCanisterSuccess, CreateCanisterFromError>,)> {
        ic_cdk::call(self.0, "create_canister_from", (arg0,)).await
    }

    pub async fn deposit(&self, arg0: &DepositArgs) -> Result<(DepositResult,)> {
        ic_cdk::call(self.0, "deposit", (arg0,)).await
    }

    pub async fn http_request(&self, arg0: &HttpRequest) -> Result<(HttpResponse,)> {
        ic_cdk::call(self.0, "http_request", (arg0,)).await
    }

    pub async fn icrc_1_balance_of(&self, arg0: &Account) -> Result<(candid::Nat,)> {
        ic_cdk::call(self.0, "icrc1_balance_of", (arg0,)).await
    }

    pub async fn icrc_1_decimals(&self) -> Result<(u8,)> {
        ic_cdk::call(self.0, "icrc1_decimals", ()).await
    }

    pub async fn icrc_1_fee(&self) -> Result<(candid::Nat,)> {
        ic_cdk::call(self.0, "icrc1_fee", ()).await
    }

    pub async fn icrc_1_metadata(&self) -> Result<(Vec<(String, MetadataValue)>,)> {
        ic_cdk::call(self.0, "icrc1_metadata", ()).await
    }

    pub async fn icrc_1_minting_account(&self) -> Result<(Option<Account>,)> {
        ic_cdk::call(self.0, "icrc1_minting_account", ()).await
    }

    pub async fn icrc_1_name(&self) -> Result<(String,)> {
        ic_cdk::call(self.0, "icrc1_name", ()).await
    }

    pub async fn icrc_1_supported_standards(&self) -> Result<(Vec<SupportedStandard>,)> {
        ic_cdk::call(self.0, "icrc1_supported_standards", ()).await
    }

    pub async fn icrc_1_symbol(&self) -> Result<(String,)> {
        ic_cdk::call(self.0, "icrc1_symbol", ()).await
    }

    pub async fn icrc_1_total_supply(&self) -> Result<(candid::Nat,)> {
        ic_cdk::call(self.0, "icrc1_total_supply", ()).await
    }

    pub async fn icrc_1_transfer(
        &self,
        arg0: &TransferArgs,
    ) -> Result<(std::result::Result<BlockIndex, TransferError>,)> {
        ic_cdk::call(self.0, "icrc1_transfer", (arg0,)).await
    }

    pub async fn icrc_2_allowance(&self, arg0: &AllowanceArgs) -> Result<(Allowance,)> {
        ic_cdk::call(self.0, "icrc2_allowance", (arg0,)).await
    }

    pub async fn icrc_2_approve(
        &self,
        arg0: &ApproveArgs,
    ) -> Result<(std::result::Result<candid::Nat, ApproveError>,)> {
        ic_cdk::call(self.0, "icrc2_approve", (arg0,)).await
    }

    pub async fn icrc_2_transfer_from(
        &self,
        arg0: &TransferFromArgs,
    ) -> Result<(std::result::Result<candid::Nat, TransferFromError>,)> {
        ic_cdk::call(self.0, "icrc2_transfer_from", (arg0,)).await
    }

    pub async fn icrc_3_get_archives(
        &self,
        arg0: &GetArchivesArgs,
    ) -> Result<(GetArchivesResult,)> {
        ic_cdk::call(self.0, "icrc3_get_archives", (arg0,)).await
    }

    pub async fn icrc_3_get_blocks(&self, arg0: &GetBlocksArgs) -> Result<(GetBlocksResult,)> {
        ic_cdk::call(self.0, "icrc3_get_blocks", (arg0,)).await
    }

    pub async fn icrc_3_get_tip_certificate(&self) -> Result<(Option<DataCertificate>,)> {
        ic_cdk::call(self.0, "icrc3_get_tip_certificate", ()).await
    }

    pub async fn icrc_3_supported_block_types(&self) -> Result<(Vec<SupportedBlockType>,)> {
        ic_cdk::call(self.0, "icrc3_supported_block_types", ()).await
    }

    pub async fn withdraw(
        &self,
        arg0: &WithdrawArgs,
    ) -> Result<(std::result::Result<BlockIndex, WithdrawError>,)> {
        ic_cdk::call(self.0, "withdraw", (arg0,)).await
    }

    pub async fn withdraw_from(
        &self,
        arg0: &WithdrawFromArgs,
    ) -> Result<(std::result::Result<BlockIndex, WithdrawFromError>,)> {
        ic_cdk::call(self.0, "withdraw_from", (arg0,)).await
    }
}
