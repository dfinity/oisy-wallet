// This is an experimental feature to generate Rust binding from Candid.
// You may want to manually adjust some of the types.
#![allow(dead_code, unused_imports)]
use candid::{self, CandidType, Deserialize, Principal};
use ic_cdk::api::call::CallResult as Result;

#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) enum ChangeIndexId {
    SetTo(Principal),
    Unset,
}
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) struct UpgradeArgs {
    pub(crate) change_index_id: Option<ChangeIndexId>,
    pub(crate) max_blocks_per_request: Option<u64>,
}
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) struct InitArgs {
    pub(crate) index_id: Option<Principal>,
    pub(crate) max_blocks_per_request: u64,
}
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) enum LedgerArgs {
    Upgrade(Option<UpgradeArgs>),
    Init(InitArgs),
}
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) struct SubnetFilter {
    pub(crate) subnet_type: Option<String>,
}
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) enum SubnetSelection {
    Filter(SubnetFilter),
    Subnet { subnet: Principal },
}
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) struct CanisterSettings {
    pub(crate) freezing_threshold: Option<candid::Nat>,
    pub(crate) controllers: Option<Vec<Principal>>,
    pub(crate) reserved_cycles_limit: Option<candid::Nat>,
    pub(crate) memory_allocation: Option<candid::Nat>,
    pub(crate) compute_allocation: Option<candid::Nat>,
}
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) struct CmcCreateCanisterArgs {
    pub(crate) subnet_selection: Option<SubnetSelection>,
    pub(crate) settings: Option<CanisterSettings>,
}
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) struct CreateCanisterArgs {
    pub(crate) from_subaccount: Option<serde_bytes::ByteBuf>,
    pub(crate) created_at_time: Option<u64>,
    pub(crate) amount: candid::Nat,
    pub(crate) creation_args: Option<CmcCreateCanisterArgs>,
}
pub(crate) type BlockIndex = candid::Nat;
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) struct CreateCanisterSuccess {
    pub(crate) block_id: BlockIndex,
    pub(crate) canister_id: Principal,
}
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) enum CreateCanisterError {
    GenericError {
        message: String,
        error_code: candid::Nat,
    },
    TemporarilyUnavailable,
    Duplicate {
        duplicate_of: candid::Nat,
        canister_id: Option<Principal>,
    },
    CreatedInFuture {
        ledger_time: u64,
    },
    FailedToCreate {
        error: String,
        refund_block: Option<BlockIndex>,
        fee_block: Option<BlockIndex>,
    },
    TooOld,
    InsufficientFunds {
        balance: candid::Nat,
    },
}
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) struct Account {
    pub(crate) owner: Principal,
    pub(crate) subaccount: Option<serde_bytes::ByteBuf>,
}
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) struct CreateCanisterFromArgs {
    pub(crate) spender_subaccount: Option<serde_bytes::ByteBuf>,
    pub(crate) from: Account,
    pub(crate) created_at_time: Option<u64>,
    pub(crate) amount: candid::Nat,
    pub(crate) creation_args: Option<CmcCreateCanisterArgs>,
}
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) enum RejectionCode {
    NoError,
    CanisterError,
    SysTransient,
    DestinationInvalid,
    Unknown,
    SysFatal,
    CanisterReject,
}
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) enum CreateCanisterFromError {
    FailedToCreateFrom {
        create_from_block: Option<BlockIndex>,
        rejection_code: RejectionCode,
        refund_block: Option<BlockIndex>,
        approval_refund_block: Option<BlockIndex>,
        rejection_reason: String,
    },
    GenericError {
        message: String,
        error_code: candid::Nat,
    },
    TemporarilyUnavailable,
    InsufficientAllowance {
        allowance: candid::Nat,
    },
    Duplicate {
        duplicate_of: candid::Nat,
        canister_id: Option<Principal>,
    },
    CreatedInFuture {
        ledger_time: u64,
    },
    TooOld,
    InsufficientFunds {
        balance: candid::Nat,
    },
}
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) struct DepositArgs {
    pub(crate) to: Account,
    pub(crate) memo: Option<serde_bytes::ByteBuf>,
}
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) struct DepositResult {
    pub(crate) balance: candid::Nat,
    pub(crate) block_index: BlockIndex,
}
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) struct HttpRequest {
    pub(crate) url: String,
    pub(crate) method: String,
    pub(crate) body: serde_bytes::ByteBuf,
    pub(crate) headers: Vec<(String, String)>,
}
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) struct HttpResponse {
    pub(crate) body: serde_bytes::ByteBuf,
    pub(crate) headers: Vec<(String, String)>,
    pub(crate) status_code: u16,
}
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) enum MetadataValue {
    Int(candid::Int),
    Nat(candid::Nat),
    Blob(serde_bytes::ByteBuf),
    Text(String),
}
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) struct SupportedStandard {
    pub(crate) url: String,
    pub(crate) name: String,
}
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) struct TransferArgs {
    pub(crate) to: Account,
    pub(crate) fee: Option<candid::Nat>,
    pub(crate) memo: Option<serde_bytes::ByteBuf>,
    pub(crate) from_subaccount: Option<serde_bytes::ByteBuf>,
    pub(crate) created_at_time: Option<u64>,
    pub(crate) amount: candid::Nat,
}
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) enum TransferError {
    GenericError {
        message: String,
        error_code: candid::Nat,
    },
    TemporarilyUnavailable,
    BadBurn {
        min_burn_amount: candid::Nat,
    },
    Duplicate {
        duplicate_of: candid::Nat,
    },
    BadFee {
        expected_fee: candid::Nat,
    },
    CreatedInFuture {
        ledger_time: u64,
    },
    TooOld,
    InsufficientFunds {
        balance: candid::Nat,
    },
}
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) struct AllowanceArgs {
    pub(crate) account: Account,
    pub(crate) spender: Account,
}
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) struct Allowance {
    pub(crate) allowance: candid::Nat,
    pub(crate) expires_at: Option<u64>,
}
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) struct ApproveArgs {
    pub(crate) fee: Option<candid::Nat>,
    pub(crate) memo: Option<serde_bytes::ByteBuf>,
    pub(crate) from_subaccount: Option<serde_bytes::ByteBuf>,
    pub(crate) created_at_time: Option<u64>,
    pub(crate) amount: candid::Nat,
    pub(crate) expected_allowance: Option<candid::Nat>,
    pub(crate) expires_at: Option<u64>,
    pub(crate) spender: Account,
}
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) enum ApproveError {
    GenericError {
        message: String,
        error_code: candid::Nat,
    },
    TemporarilyUnavailable,
    Duplicate {
        duplicate_of: candid::Nat,
    },
    BadFee {
        expected_fee: candid::Nat,
    },
    AllowanceChanged {
        current_allowance: candid::Nat,
    },
    CreatedInFuture {
        ledger_time: u64,
    },
    TooOld,
    Expired {
        ledger_time: u64,
    },
    InsufficientFunds {
        balance: candid::Nat,
    },
}
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) struct TransferFromArgs {
    pub(crate) to: Account,
    pub(crate) fee: Option<candid::Nat>,
    pub(crate) spender_subaccount: Option<serde_bytes::ByteBuf>,
    pub(crate) from: Account,
    pub(crate) memo: Option<serde_bytes::ByteBuf>,
    pub(crate) created_at_time: Option<u64>,
    pub(crate) amount: candid::Nat,
}
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) enum TransferFromError {
    GenericError {
        message: String,
        error_code: candid::Nat,
    },
    TemporarilyUnavailable,
    InsufficientAllowance {
        allowance: candid::Nat,
    },
    BadBurn {
        min_burn_amount: candid::Nat,
    },
    Duplicate {
        duplicate_of: candid::Nat,
    },
    BadFee {
        expected_fee: candid::Nat,
    },
    CreatedInFuture {
        ledger_time: u64,
    },
    TooOld,
    InsufficientFunds {
        balance: candid::Nat,
    },
}
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) struct GetArchivesArgs {
    pub(crate) from: Option<Principal>,
}
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) struct GetArchivesResultItem {
    pub(crate) end: candid::Nat,
    pub(crate) canister_id: Principal,
    pub(crate) start: candid::Nat,
}
pub(crate) type GetArchivesResult = Vec<GetArchivesResultItem>;
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) struct GetBlocksArgsItem {
    pub(crate) start: candid::Nat,
    pub(crate) length: candid::Nat,
}
pub(crate) type GetBlocksArgs = Vec<GetBlocksArgsItem>;
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) enum Value {
    Int(candid::Int),
    Map(Vec<(String, Box<Value>)>),
    Nat(candid::Nat),
    Nat64(u64),
    Blob(serde_bytes::ByteBuf),
    Text(String),
    Array(Vec<Box<Value>>),
}
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) struct GetBlocksResultBlocksItem {
    pub(crate) id: candid::Nat,
    pub(crate) block: Box<Value>,
}
candid::define_function!(pub(crate) GetBlocksResultArchivedBlocksItemCallback : (
    GetBlocksArgs,
  ) -> (GetBlocksResult) query);
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) struct GetBlocksResultArchivedBlocksItem {
    pub(crate) args: GetBlocksArgs,
    pub(crate) callback: GetBlocksResultArchivedBlocksItemCallback,
}
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) struct GetBlocksResult {
    pub(crate) log_length: candid::Nat,
    pub(crate) blocks: Vec<GetBlocksResultBlocksItem>,
    pub(crate) archived_blocks: Vec<GetBlocksResultArchivedBlocksItem>,
}
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) struct DataCertificate {
    pub(crate) certificate: serde_bytes::ByteBuf,
    pub(crate) hash_tree: serde_bytes::ByteBuf,
}
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) struct SupportedBlockType {
    pub(crate) url: String,
    pub(crate) block_type: String,
}
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) struct WithdrawArgs {
    pub(crate) to: Principal,
    pub(crate) from_subaccount: Option<serde_bytes::ByteBuf>,
    pub(crate) created_at_time: Option<u64>,
    pub(crate) amount: candid::Nat,
}
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) enum WithdrawError {
    FailedToWithdraw {
        rejection_code: RejectionCode,
        fee_block: Option<candid::Nat>,
        rejection_reason: String,
    },
    GenericError {
        message: String,
        error_code: candid::Nat,
    },
    TemporarilyUnavailable,
    Duplicate {
        duplicate_of: candid::Nat,
    },
    BadFee {
        expected_fee: candid::Nat,
    },
    InvalidReceiver {
        receiver: Principal,
    },
    CreatedInFuture {
        ledger_time: u64,
    },
    TooOld,
    InsufficientFunds {
        balance: candid::Nat,
    },
}
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) struct WithdrawFromArgs {
    pub(crate) to: Principal,
    pub(crate) spender_subaccount: Option<serde_bytes::ByteBuf>,
    pub(crate) from: Account,
    pub(crate) created_at_time: Option<u64>,
    pub(crate) amount: candid::Nat,
}
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq, Clone)]
pub(crate) enum WithdrawFromError {
    GenericError {
        message: String,
        error_code: candid::Nat,
    },
    TemporarilyUnavailable,
    InsufficientAllowance {
        allowance: candid::Nat,
    },
    Duplicate {
        duplicate_of: BlockIndex,
    },
    InvalidReceiver {
        receiver: Principal,
    },
    CreatedInFuture {
        ledger_time: u64,
    },
    TooOld,
    FailedToWithdrawFrom {
        withdraw_from_block: Option<candid::Nat>,
        rejection_code: RejectionCode,
        refund_block: Option<candid::Nat>,
        approval_refund_block: Option<candid::Nat>,
        rejection_reason: String,
    },
    InsufficientFunds {
        balance: candid::Nat,
    },
}

pub struct Service(pub Principal);
impl Service {
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
