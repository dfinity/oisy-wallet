use candid::{CandidType, Deserialize};
use serde_bytes::ByteBuf;

use super::{
    bitcoin::{
        BtcAddPendingTransactionError, BtcGetPendingTransactionsError,
        BtcGetPendingTransactionsReponse,
    },
    dapp::AddDappSettingsError,
    notification::AddDismissedNotificationError,
    signer::{
        AllowSigningError, AllowSigningResponse, GetAllowedCyclesError, GetAllowedCyclesResponse,
    },
    user_profile::{CreateUserProfileError, GetUserProfileError, UserProfile},
};
use crate::types::{
    active_user_transaction::{
        ActiveUserTransaction, ActiveUserTransactionError, GetActiveUserTransactionsResponse,
    },
    agreement::{AgreementHistoryEntry, GetAgreementHistoryError, UpdateAgreementsError},
    bitcoin::{BtcGetFeePercentilesError, BtcGetFeePercentilesResponse},
    contact::{Contact, ContactError},
    experimental_feature::UpdateExperimentalFeaturesSettingsError,
    network::{SetTestnetsSettingsError, UpdateNetworksSettingsError},
    onramper::{SignOnramperWidgetUrlError, SignOnramperWidgetUrlResponse},
    personal_note::{PersonalNoteEntry, PersonalNoteError},
    transaction_settings::UpdateTransactionFilterSettingsError,
    user_transaction::{GetUserTransactionsResponse, UserTransactionError},
};

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum CreateContactResult {
    /// The contact was retrieved successfully.
    Ok(Contact),
    /// The contact could not be created due to an error
    Err(ContactError),
}

impl From<Result<Contact, ContactError>> for CreateContactResult {
    fn from(result: Result<Contact, ContactError>) -> Self {
        match result {
            Ok(contact) => CreateContactResult::Ok(contact),
            Err(err) => CreateContactResult::Err(err),
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum UpdateContactResult {
    /// The contact was updated successfully.
    Ok(Contact),
    /// The contact could not be updated due to an error
    Err(ContactError),
}

impl From<Result<Contact, ContactError>> for UpdateContactResult {
    fn from(result: Result<Contact, ContactError>) -> Self {
        match result {
            Ok(contact) => UpdateContactResult::Ok(contact),
            Err(err) => UpdateContactResult::Err(err),
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum GetContactResult {
    /// The contacts were retrieved successfully.
    Ok(Contact),
    /// The contacts were not retrieved due to an error.
    Err(ContactError),
}

impl From<Result<Contact, ContactError>> for GetContactResult {
    fn from(result: Result<Contact, ContactError>) -> Self {
        match result {
            Ok(contact) => GetContactResult::Ok(contact),
            Err(err) => GetContactResult::Err(err),
        }
    }
}
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum DeleteContactResult {
    /// The contact was deleted successfully.
    Ok(u64),
    /// The contact was not deleted due to an error.
    Err(ContactError),
}
impl From<Result<u64, ContactError>> for DeleteContactResult {
    fn from(result: Result<u64, ContactError>) -> Self {
        match result {
            Ok(id) => DeleteContactResult::Ok(id),
            Err(err) => DeleteContactResult::Err(err),
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum GetContactsResult {
    /// The contacts were retrieved successfully.
    Ok(Vec<Contact>),
    /// The contacts were not retrieved due to an error.
    Err(ContactError),
}
impl From<Result<Vec<Contact>, ContactError>> for GetContactsResult {
    fn from(result: Result<Vec<Contact>, ContactError>) -> Self {
        match result {
            Ok(contacts) => GetContactsResult::Ok(contacts),
            Err(err) => GetContactsResult::Err(err),
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum UpdateUserNetworkSettingsResult {
    /// The user's network settings were updated successfully.
    Ok(()),
    /// The user's network settings were not updated due to an error.
    Err(UpdateNetworksSettingsError),
}
impl From<Result<(), UpdateNetworksSettingsError>> for UpdateUserNetworkSettingsResult {
    fn from(result: Result<(), UpdateNetworksSettingsError>) -> Self {
        match result {
            Ok(()) => UpdateUserNetworkSettingsResult::Ok(()),
            Err(err) => UpdateUserNetworkSettingsResult::Err(err),
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum SetUserShowTestnetsResult {
    /// The user's show testnets was set successfully.
    Ok(()),
    /// The user's show testnets was not set due to an error.
    Err(SetTestnetsSettingsError),
}
impl From<Result<(), SetTestnetsSettingsError>> for SetUserShowTestnetsResult {
    fn from(result: Result<(), SetTestnetsSettingsError>) -> Self {
        match result {
            Ok(()) => SetUserShowTestnetsResult::Ok(()),
            Err(err) => SetUserShowTestnetsResult::Err(err),
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum GetUserProfileResult {
    /// The user's profile was retrieved successfully.
    Ok(Box<UserProfile>),
    /// The user's profile was not retrieved due to an error.
    Err(GetUserProfileError),
}
impl From<Result<UserProfile, GetUserProfileError>> for GetUserProfileResult {
    fn from(result: Result<UserProfile, GetUserProfileError>) -> Self {
        match result {
            Ok(profile) => GetUserProfileResult::Ok(Box::new(profile)),
            Err(err) => GetUserProfileResult::Err(err),
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum CreateUserProfileResult {
    /// The user's profile was created (or already existed) and is returned.
    Ok(Box<UserProfile>),
    /// The profile could not be created due to an error.
    Err(CreateUserProfileError),
}
impl From<Result<UserProfile, CreateUserProfileError>> for CreateUserProfileResult {
    fn from(result: Result<UserProfile, CreateUserProfileError>) -> Self {
        match result {
            Ok(profile) => CreateUserProfileResult::Ok(Box::new(profile)),
            Err(err) => CreateUserProfileResult::Err(err),
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum GetAllowedCyclesResult {
    /// The allowed cycles were retrieved successfully.
    Ok(GetAllowedCyclesResponse),
    /// The allowed cycles were not retrieved due to an error.
    Err(GetAllowedCyclesError),
}
impl From<Result<GetAllowedCyclesResponse, GetAllowedCyclesError>> for GetAllowedCyclesResult {
    fn from(result: Result<GetAllowedCyclesResponse, GetAllowedCyclesError>) -> Self {
        match result {
            Ok(response) => GetAllowedCyclesResult::Ok(response),
            Err(err) => GetAllowedCyclesResult::Err(err),
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum BtcGetFeePercentilesResult {
    /// The fee was selected successfully.
    Ok(BtcGetFeePercentilesResponse),
    /// The fee was not selected due to an error.
    Err(BtcGetFeePercentilesError),
}
impl From<Result<BtcGetFeePercentilesResponse, BtcGetFeePercentilesError>>
    for BtcGetFeePercentilesResult
{
    fn from(result: Result<BtcGetFeePercentilesResponse, BtcGetFeePercentilesError>) -> Self {
        match result {
            Ok(response) => BtcGetFeePercentilesResult::Ok(response),
            Err(err) => BtcGetFeePercentilesResult::Err(err),
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum BtcGetPendingTransactionsResult {
    /// The pending transactions were retrieved successfully.
    Ok(BtcGetPendingTransactionsReponse),
    /// The pending transactions were not retrieved due to an error.
    Err(BtcGetPendingTransactionsError),
}
impl From<Result<BtcGetPendingTransactionsReponse, BtcGetPendingTransactionsError>>
    for BtcGetPendingTransactionsResult
{
    fn from(
        result: Result<BtcGetPendingTransactionsReponse, BtcGetPendingTransactionsError>,
    ) -> Self {
        match result {
            Ok(response) => BtcGetPendingTransactionsResult::Ok(response),
            Err(err) => BtcGetPendingTransactionsResult::Err(err),
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum BtcAddPendingTransactionResult {
    /// The pending transaction was added successfully.
    Ok(()),
    /// The pending transaction was not added due to an error.
    Err(BtcAddPendingTransactionError),
}
impl From<Result<(), BtcAddPendingTransactionError>> for BtcAddPendingTransactionResult {
    fn from(result: Result<(), BtcAddPendingTransactionError>) -> Self {
        match result {
            Ok(()) => BtcAddPendingTransactionResult::Ok(()),
            Err(err) => BtcAddPendingTransactionResult::Err(err),
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum AllowSigningResult {
    /// The signing was allowed successfully.
    Ok(AllowSigningResponse),
    /// The signing was not allowed due to an error.
    Err(AllowSigningError),
}
impl From<Result<AllowSigningResponse, AllowSigningError>> for AllowSigningResult {
    fn from(result: Result<AllowSigningResponse, AllowSigningError>) -> Self {
        match result {
            Ok(response) => AllowSigningResult::Ok(response),
            Err(err) => AllowSigningResult::Err(err),
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum AddUserHiddenDappIdResult {
    /// The user's hidden dapp id was added successfully.
    Ok(()),
    /// The user's hidden dapp id was not added due to an error.
    Err(AddDappSettingsError),
}
impl From<Result<(), AddDappSettingsError>> for AddUserHiddenDappIdResult {
    fn from(result: Result<(), AddDappSettingsError>) -> Self {
        match result {
            Ok(()) => AddUserHiddenDappIdResult::Ok(()),
            Err(err) => AddUserHiddenDappIdResult::Err(err),
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum AddUserDismissedNotificationResult {
    Ok(()),
    Err(AddDismissedNotificationError),
}
impl From<Result<(), AddDismissedNotificationError>> for AddUserDismissedNotificationResult {
    fn from(result: Result<(), AddDismissedNotificationError>) -> Self {
        match result {
            Ok(()) => AddUserDismissedNotificationResult::Ok(()),
            Err(err) => AddUserDismissedNotificationResult::Err(err),
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum UpdateUserAgreementsResult {
    /// The user's agreements were updated successfully.
    Ok(()),
    /// The user's agreements were not updated due to an error.
    Err(UpdateAgreementsError),
}
impl From<Result<(), UpdateAgreementsError>> for UpdateUserAgreementsResult {
    fn from(result: Result<(), UpdateAgreementsError>) -> Self {
        match result {
            Ok(()) => UpdateUserAgreementsResult::Ok(()),
            Err(err) => UpdateUserAgreementsResult::Err(err),
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum UpdateProviderAgreementsResult {
    /// The user's provider agreements were updated successfully.
    Ok(()),
    /// The user's provider agreements were not updated due to an error.
    Err(UpdateAgreementsError),
}
impl From<Result<(), UpdateAgreementsError>> for UpdateProviderAgreementsResult {
    fn from(result: Result<(), UpdateAgreementsError>) -> Self {
        match result {
            Ok(()) => UpdateProviderAgreementsResult::Ok(()),
            Err(err) => UpdateProviderAgreementsResult::Err(err),
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum UpdateExperimentalFeaturesSettingsResult {
    /// The user's experimental features settings were updated successfully.
    Ok(()),
    /// The user's experimental features settings were not updated due to an error.
    Err(UpdateExperimentalFeaturesSettingsError),
}
impl From<Result<(), UpdateExperimentalFeaturesSettingsError>>
    for UpdateExperimentalFeaturesSettingsResult
{
    fn from(result: Result<(), UpdateExperimentalFeaturesSettingsError>) -> Self {
        match result {
            Ok(()) => UpdateExperimentalFeaturesSettingsResult::Ok(()),
            Err(err) => UpdateExperimentalFeaturesSettingsResult::Err(err),
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum UpdateTransactionFilterSettingsResult {
    Ok(()),
    Err(UpdateTransactionFilterSettingsError),
}
impl From<Result<(), UpdateTransactionFilterSettingsError>>
    for UpdateTransactionFilterSettingsResult
{
    fn from(result: Result<(), UpdateTransactionFilterSettingsError>) -> Self {
        match result {
            Ok(()) => UpdateTransactionFilterSettingsResult::Ok(()),
            Err(err) => UpdateTransactionFilterSettingsResult::Err(err),
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum GetUserTransactionsResult {
    Ok(GetUserTransactionsResponse),
    Err(UserTransactionError),
}
impl From<Result<GetUserTransactionsResponse, UserTransactionError>> for GetUserTransactionsResult {
    fn from(result: Result<GetUserTransactionsResponse, UserTransactionError>) -> Self {
        match result {
            Ok(response) => GetUserTransactionsResult::Ok(response),
            Err(err) => GetUserTransactionsResult::Err(err),
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum SaveUserTransactionsResult {
    Ok(()),
    Err(UserTransactionError),
}
impl From<Result<(), UserTransactionError>> for SaveUserTransactionsResult {
    fn from(result: Result<(), UserTransactionError>) -> Self {
        match result {
            Ok(()) => SaveUserTransactionsResult::Ok(()),
            Err(err) => SaveUserTransactionsResult::Err(err),
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum GetAgreementHistoryResult {
    Ok(Vec<AgreementHistoryEntry>),
    Err(GetAgreementHistoryError),
}
impl From<Result<Vec<AgreementHistoryEntry>, GetAgreementHistoryError>>
    for GetAgreementHistoryResult
{
    fn from(result: Result<Vec<AgreementHistoryEntry>, GetAgreementHistoryError>) -> Self {
        match result {
            Ok(entries) => GetAgreementHistoryResult::Ok(entries),
            Err(err) => GetAgreementHistoryResult::Err(err),
        }
    }
}

/// Shared result for endpoints that return a single `ActiveUserTransaction`
/// (both `create_active_user_transaction` and `update_active_user_transaction`).
/// One type because the wire shape is identical — the candid extractor would
/// dedupe twin variants anyway.
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum ActiveUserTransactionResult {
    Ok(Box<ActiveUserTransaction>),
    Err(ActiveUserTransactionError),
}
impl From<Result<ActiveUserTransaction, ActiveUserTransactionError>>
    for ActiveUserTransactionResult
{
    fn from(result: Result<ActiveUserTransaction, ActiveUserTransactionError>) -> Self {
        match result {
            Ok(tx) => ActiveUserTransactionResult::Ok(Box::new(tx)),
            Err(err) => ActiveUserTransactionResult::Err(err),
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum GetActiveUserTransactionsResult {
    Ok(GetActiveUserTransactionsResponse),
    Err(ActiveUserTransactionError),
}
impl From<Result<GetActiveUserTransactionsResponse, ActiveUserTransactionError>>
    for GetActiveUserTransactionsResult
{
    fn from(result: Result<GetActiveUserTransactionsResponse, ActiveUserTransactionError>) -> Self {
        match result {
            Ok(response) => GetActiveUserTransactionsResult::Ok(response),
            Err(err) => GetActiveUserTransactionsResult::Err(err),
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum DeleteActiveUserTransactionResult {
    Ok(()),
    Err(ActiveUserTransactionError),
}
impl From<Result<(), ActiveUserTransactionError>> for DeleteActiveUserTransactionResult {
    fn from(result: Result<(), ActiveUserTransactionError>) -> Self {
        match result {
            Ok(()) => DeleteActiveUserTransactionResult::Ok(()),
            Err(err) => DeleteActiveUserTransactionResult::Err(err),
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum SignOnramperWidgetUrlResult {
    /// The signature plus the exact canonical query fragment that was signed.
    Ok(SignOnramperWidgetUrlResponse),
    Err(SignOnramperWidgetUrlError),
}
impl From<Result<SignOnramperWidgetUrlResponse, SignOnramperWidgetUrlError>>
    for SignOnramperWidgetUrlResult
{
    fn from(result: Result<SignOnramperWidgetUrlResponse, SignOnramperWidgetUrlError>) -> Self {
        match result {
            Ok(response) => SignOnramperWidgetUrlResult::Ok(response),
            Err(err) => SignOnramperWidgetUrlResult::Err(err),
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum SetPersonalNoteResult {
    /// The note was created or updated successfully.
    Ok(()),
    /// The note could not be stored due to an error.
    Err(PersonalNoteError),
}
impl From<Result<(), PersonalNoteError>> for SetPersonalNoteResult {
    fn from(result: Result<(), PersonalNoteError>) -> Self {
        match result {
            Ok(()) => SetPersonalNoteResult::Ok(()),
            Err(err) => SetPersonalNoteResult::Err(err),
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum DeletePersonalNoteResult {
    /// The note was deleted (idempotent — also `Ok` when it did not exist).
    Ok(()),
    /// The note could not be deleted due to an error.
    Err(PersonalNoteError),
}
impl From<Result<(), PersonalNoteError>> for DeletePersonalNoteResult {
    fn from(result: Result<(), PersonalNoteError>) -> Self {
        match result {
            Ok(()) => DeletePersonalNoteResult::Ok(()),
            Err(err) => DeletePersonalNoteResult::Err(err),
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum GetPersonalNotesResult {
    /// All of the caller's (encrypted) notes.
    Ok(Vec<PersonalNoteEntry>),
    /// The notes could not be retrieved due to an error.
    Err(PersonalNoteError),
}
impl From<Result<Vec<PersonalNoteEntry>, PersonalNoteError>> for GetPersonalNotesResult {
    fn from(result: Result<Vec<PersonalNoteEntry>, PersonalNoteError>) -> Self {
        match result {
            Ok(entries) => GetPersonalNotesResult::Ok(entries),
            Err(err) => GetPersonalNotesResult::Err(err),
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum GetPersonalNotesCountResult {
    /// The caller's total note count.
    Ok(u64),
    /// The count could not be retrieved due to an error.
    Err(PersonalNoteError),
}
impl From<Result<u64, PersonalNoteError>> for GetPersonalNotesCountResult {
    fn from(result: Result<u64, PersonalNoteError>) -> Self {
        match result {
            Ok(count) => GetPersonalNotesCountResult::Ok(count),
            Err(err) => GetPersonalNotesCountResult::Err(err),
        }
    }
}

/// Shared result for the two vetKey-derivation endpoints (the caller's encrypted
/// vetKey and the store's public verification key). Both return opaque bytes on
/// success; the wire shape is identical, so one enum serves both.
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum PersonalNotesVetkeyResult {
    /// vetKey bytes, opaque to the canister.
    Ok(ByteBuf),
    /// The vetKey could not be derived due to an error.
    Err(PersonalNoteError),
}
impl From<Result<ByteBuf, PersonalNoteError>> for PersonalNotesVetkeyResult {
    fn from(result: Result<ByteBuf, PersonalNoteError>) -> Self {
        match result {
            Ok(vetkey) => PersonalNotesVetkeyResult::Ok(vetkey),
            Err(err) => PersonalNotesVetkeyResult::Err(err),
        }
    }
}
