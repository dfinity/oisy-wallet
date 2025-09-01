use candid::{CandidType, Deserialize};
use serde::Serialize;

use super::{
    bitcoin::{
        BtcAddPendingTransactionError, BtcGetPendingTransactionsError,
        BtcGetPendingTransactionsReponse, SelectedUtxosFeeError, SelectedUtxosFeeResponse,
    },
    dapp::AddDappSettingsError,
    pow::{CreateChallengeError, CreateChallengeResponse},
    signer::{
        AllowSigningError, AllowSigningResponse, GetAllowedCyclesError, GetAllowedCyclesResponse,
    },
    user_profile::{GetUserProfileError, UserProfile},
};
use crate::types::{
    agreement::SaveAgreementsSettingsError,
    bitcoin::BtcGetFeePercentilesResponse,
    contact::{Contact, ContactError},
    network::{SaveNetworksSettingsError, SaveTestnetsSettingsError},
    user_profile::AddUserCredentialError,
};

#[derive(CandidType, Serialize, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum AddUserCredentialResult {
    /// The user's credential was added successfully.
    Ok(()),
    /// The user's credential was not added due to an error.
    Err(AddUserCredentialError),
}
impl AddUserCredentialResult {
    #[must_use]
    pub fn is_err(&self) -> bool {
        matches!(self, Self::Err(_))
    }

    /// Returns the contained `AddUserCredentialError` if the result is an `Err`.
    ///
    /// # Panics
    /// - If the result is `Ok`.
    #[must_use]
    pub fn unwrap_err(self) -> AddUserCredentialError {
        match self {
            Self::Err(err) => err,
            Self::Ok(()) => {
                panic!("Called `AddUserCredentialResult.unwrap_err()` on an `Ok` value")
            }
        }
    }
}
impl From<Result<(), AddUserCredentialError>> for AddUserCredentialResult {
    fn from(result: Result<(), AddUserCredentialError>) -> Self {
        match result {
            Ok(()) => AddUserCredentialResult::Ok(()),
            Err(err) => AddUserCredentialResult::Err(err),
        }
    }
}

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
    Err(SaveNetworksSettingsError),
}
impl From<Result<(), SaveNetworksSettingsError>> for UpdateUserNetworkSettingsResult {
    fn from(result: Result<(), SaveNetworksSettingsError>) -> Self {
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
    Err(SaveTestnetsSettingsError),
}
impl From<Result<(), SaveTestnetsSettingsError>> for SetUserShowTestnetsResult {
    fn from(result: Result<(), SaveTestnetsSettingsError>) -> Self {
        match result {
            Ok(()) => SetUserShowTestnetsResult::Ok(()),
            Err(err) => SetUserShowTestnetsResult::Err(err),
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum GetUserProfileResult {
    /// The user's profile was retrieved successfully.
    Ok(UserProfile),
    /// The user's profile was not retrieved due to an error.
    Err(GetUserProfileError),
}
impl From<Result<UserProfile, GetUserProfileError>> for GetUserProfileResult {
    fn from(result: Result<UserProfile, GetUserProfileError>) -> Self {
        match result {
            Ok(profile) => GetUserProfileResult::Ok(profile),
            Err(err) => GetUserProfileResult::Err(err),
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
pub enum CreatePowChallengeResult {
    /// The pow challenge was created successfully.
    Ok(CreateChallengeResponse),
    /// The pow challenge was not created due to an error.
    Err(CreateChallengeError),
}
impl From<Result<CreateChallengeResponse, CreateChallengeError>> for CreatePowChallengeResult {
    fn from(result: Result<CreateChallengeResponse, CreateChallengeError>) -> Self {
        match result {
            Ok(response) => CreatePowChallengeResult::Ok(response),
            Err(err) => CreatePowChallengeResult::Err(err),
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum BtcSelectUserUtxosFeeResult {
    /// The fee was selected successfully.
    Ok(SelectedUtxosFeeResponse),
    /// The fee was not selected due to an error.
    Err(SelectedUtxosFeeError),
}
impl From<Result<SelectedUtxosFeeResponse, SelectedUtxosFeeError>> for BtcSelectUserUtxosFeeResult {
    fn from(result: Result<SelectedUtxosFeeResponse, SelectedUtxosFeeError>) -> Self {
        match result {
            Ok(response) => BtcSelectUserUtxosFeeResult::Ok(response),
            Err(err) => BtcSelectUserUtxosFeeResult::Err(err),
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum BtcGetFeePercentilesResult {
    /// The fee was selected successfully.
    Ok(BtcGetFeePercentilesResponse),
    /// The fee was not selected due to an error.
    Err(SelectedUtxosFeeError),
}
impl From<Result<BtcGetFeePercentilesResponse, SelectedUtxosFeeError>>
    for BtcGetFeePercentilesResult
{
    fn from(result: Result<BtcGetFeePercentilesResponse, SelectedUtxosFeeError>) -> Self {
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
pub enum UpdateUserAgreementsResult {
    /// The user's agreements were updated successfully.
    Ok(()),
    /// The user's agreements were not updated due to an error.
    Err(SaveAgreementsSettingsError),
}
impl From<Result<(), SaveAgreementsSettingsError>> for UpdateUserAgreementsResult {
    fn from(result: Result<(), SaveAgreementsSettingsError>) -> Self {
        match result {
            Ok(()) => UpdateUserAgreementsResult::Ok(()),
            Err(err) => UpdateUserAgreementsResult::Err(err),
        }
    }
}
