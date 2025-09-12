// This is an experimental feature to generate Rust binding from Candid.
// You may want to manually adjust some of the types.
#![allow(dead_code, unused_imports, clippy::missing_errors_doc)]
use candid::{self, CandidType, Deserialize, Nat, Principal};
use ic_cdk::call::{Call, CallResult, CallResult as Result, CandidDecodeFailed};
pub use ic_cycles_ledger_types::*;

pub struct CyclesLedgerService(pub Principal);
impl CyclesLedgerService {
    pub async fn create_canister(
        &self,
        arg0: &CreateCanisterArgs,
    ) -> Result<(std::result::Result<CreateCanisterSuccess, CreateCanisterError>,)> {
        let response = Call::unbounded_wait(self.0, "create_canister")
            .with_arg(arg0)
            .await?;
        Ok(response.candid()?)
    }

    pub async fn create_canister_from(
        &self,
        arg0: &CreateCanisterFromArgs,
    ) -> Result<(std::result::Result<CreateCanisterSuccess, CreateCanisterFromError>,)> {
        let response = Call::unbounded_wait(self.0, "create_canister_from")
            .with_arg(arg0)
            .await?;
        Ok(response.candid()?)
    }

    pub async fn deposit(&self, arg0: &DepositArgs) -> Result<(DepositResult,)> {
        let response = Call::unbounded_wait(self.0, "deposit")
            .with_arg(arg0)
            .await?;
        Ok(response.candid()?)
    }

    pub async fn http_request(&self, arg0: &HttpRequest) -> Result<(HttpResponse,)> {
        let response = Call::unbounded_wait(self.0, "http_request")
            .with_arg(arg0)
            .await?;
        Ok(response.candid()?)
    }

    pub async fn icrc_1_balance_of(&self, arg0: &Account) -> Result<(Nat,)> {
        let response = Call::unbounded_wait(self.0, "icrc1_balance_of")
            .with_arg(arg0)
            .await?;
        Ok((response.candid()?,))
    }

    pub async fn icrc_1_decimals(&self) -> Result<(u8,)> {
        let response = Call::unbounded_wait(self.0, "icrc1_decimals").await?;
        Ok(response.candid()?)
    }

    pub async fn icrc_1_fee(&self) -> Result<(candid::Nat,)> {
        let response = Call::unbounded_wait(self.0, "icrc1_fee").await?;
        Ok(response.candid()?)
    }

    pub async fn icrc_1_metadata(&self) -> Result<(Vec<(String, MetadataValue)>,)> {
        let response = Call::unbounded_wait(self.0, "icrc1_metadata").await?;
        Ok(response.candid()?)
    }

    pub async fn icrc_1_minting_account(&self) -> Result<(Option<Account>,)> {
        let response = Call::unbounded_wait(self.0, "icrc1_minting_account").await?;
        Ok(response.candid()?)
    }

    pub async fn icrc_1_name(&self) -> Result<(String,)> {
        let response = Call::unbounded_wait(self.0, "icrc1_name").await?;
        Ok(response.candid()?)
    }

    pub async fn icrc_1_supported_standards(&self) -> Result<(Vec<SupportedStandard>,)> {
        let response = Call::unbounded_wait(self.0, "icrc1_supported_standards").await?;
        Ok(response.candid()?)
    }

    pub async fn icrc_1_symbol(&self) -> Result<(String,)> {
        let response = Call::unbounded_wait(self.0, "icrc1_symbol").await?;
        Ok(response.candid()?)
    }

    pub async fn icrc_1_total_supply(&self) -> Result<(candid::Nat,)> {
        let response = Call::unbounded_wait(self.0, "icrc1_total_supply").await?;
        Ok(response.candid()?)
    }

    pub async fn icrc_1_transfer(
        &self,
        arg0: &TransferArgs,
    ) -> Result<(std::result::Result<BlockIndex, TransferError>,)> {
        let response = Call::unbounded_wait(self.0, "icrc1_transfer")
            .with_arg(arg0)
            .await?;
        Ok(response.candid()?)
    }

    pub async fn icrc_2_allowance(&self, arg0: &AllowanceArgs) -> Result<(Allowance,)> {
        let response = Call::unbounded_wait(self.0, "icrc2_allowance")
            .with_arg(arg0)
            .await?;
        Ok((response.candid()?,))
    }

    pub async fn icrc_2_approve(
        &self,
        arg0: &ApproveArgs,
    ) -> Result<(std::result::Result<candid::Nat, ApproveError>,)> {
        let response = Call::unbounded_wait(self.0, "icrc2_approve")
            .with_arg(arg0)
            .await?;
        Ok((response.candid()?,))
    }

    pub async fn icrc_2_transfer_from(
        &self,
        arg0: &TransferFromArgs,
    ) -> Result<(std::result::Result<candid::Nat, TransferFromError>,)> {
        let response = Call::unbounded_wait(self.0, "icrc2_transfer_from")
            .with_arg(arg0)
            .await?;
        Ok(response.candid()?)
    }

    pub async fn icrc_3_get_archives(
        &self,
        arg0: &GetArchivesArgs,
    ) -> Result<(GetArchivesResult,)> {
        let response = Call::unbounded_wait(self.0, "icrc3_get_archives")
            .with_arg(arg0)
            .await?;
        Ok(response.candid()?)
    }

    pub async fn icrc_3_get_blocks(&self, arg0: &GetBlocksArgs) -> Result<(GetBlocksResult,)> {
        let response = Call::unbounded_wait(self.0, "icrc3_get_blocks")
            .with_arg(arg0)
            .await?;
        Ok(response.candid()?)
    }

    pub async fn icrc_3_get_tip_certificate(&self) -> Result<(Option<DataCertificate>,)> {
        let response = Call::unbounded_wait(self.0, "icrc3_get_tip_certificate").await?;
        Ok(response.candid()?)
    }

    pub async fn icrc_3_supported_block_types(&self) -> Result<(Vec<SupportedBlockType>,)> {
        let response = Call::unbounded_wait(self.0, "icrc3_supported_block_types").await?;
        Ok(response.candid()?)
    }

    pub async fn withdraw(
        &self,
        arg0: &WithdrawArgs,
    ) -> Result<(std::result::Result<BlockIndex, WithdrawError>,)> {
        let response = Call::unbounded_wait(self.0, "withdraw")
            .with_arg(arg0)
            .await?;
        Ok(response.candid()?)
    }

    pub async fn withdraw_from(
        &self,
        arg0: &WithdrawFromArgs,
    ) -> Result<(std::result::Result<BlockIndex, WithdrawFromError>,)> {
        let response = Call::unbounded_wait(self.0, "withdraw_from")
            .with_arg(arg0)
            .await?;
        Ok(response.candid()?)
    }
}
