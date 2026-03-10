import type {
	AddUserCredentialResult,
	BtcGetFeePercentilesResponse,
	Contact,
	CustomToken,
	GetAllowedCyclesResponse,
	PendingTransaction,
	UserProfile
} from '$declarations/backend/backend.did';
import { BackendCanister } from '$lib/canisters/backend.canister';
import { BACKEND_CANISTER_ID } from '$lib/constants/app.constants';
import type {
	AddPendingTransactionOutcome,
	AddUserCredentialParams,
	AddUserHiddenDappIdParams,
	AllowSigningOutcome,
	BtcAddPendingTransactionParams,
	BtcGetFeePercentilesParams,
	BtcGetPendingTransactionParams,
	BtcSelectUserUtxosFeeParams,
	CreateContactParams,
	DeleteContactParams,
	GetContactParams,
	GetUserProfileResponse,
	SaveUserAgreements,
	SaveUserNetworksSettings,
	SelectedUtxosFeeOutcome,
	SetUserShowTestnetsParams,
	UpdateContactParams,
	UpdateUserExperimentalFeatureSettings
} from '$lib/types/api';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import { assertNonNullish, isNullish, type QueryParams } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';

let canister: BackendCanister | undefined = undefined;

export const listCustomTokens = async ({
	identity
}: CanisterApiFunctionParams): Promise<CustomToken[]> => {
	const { listCustomTokens } = await backendCanister({ identity });

	return listCustomTokens();
};

export const setManyCustomTokens = async ({
	identity,
	tokens
}: CanisterApiFunctionParams<{
	tokens: CustomToken[];
}>): Promise<void> => {
	const { setManyCustomTokens } = await backendCanister({ identity });

	return setManyCustomTokens({ tokens });
};

export const setCustomToken = async ({
	token,
	identity
}: CanisterApiFunctionParams<{
	token: CustomToken;
}>): Promise<void> => {
	const { setCustomToken } = await backendCanister({ identity });

	return setCustomToken({ token });
};

export const removeCustomToken = async ({
	identity,
	...restParams
}: CanisterApiFunctionParams<{ token: CustomToken }>): Promise<void> => {
	const { removeCustomToken } = await backendCanister({ identity });

	return removeCustomToken(restParams);
};

export const createUserProfile = async ({
	identity
}: CanisterApiFunctionParams): Promise<UserProfile> => {
	const { createUserProfile } = await backendCanister({ identity });

	return createUserProfile();
};

export const getUserProfile = async ({
	identity,
	certified
}: CanisterApiFunctionParams<QueryParams>): Promise<GetUserProfileResponse> => {
	const { getUserProfile } = await backendCanister({ identity });

	return getUserProfile({ certified });
};

export const addUserCredential = async ({
	identity,
	...params
}: CanisterApiFunctionParams<AddUserCredentialParams>): Promise<AddUserCredentialResult> => {
	const { addUserCredential } = await backendCanister({ identity });

	return addUserCredential(params);
};

export const addPendingBtcTransaction = async ({
	identity,
	...params
}: CanisterApiFunctionParams<BtcAddPendingTransactionParams>): Promise<AddPendingTransactionOutcome> => {
	const { btcAddPendingTransaction } = await backendCanister({ identity });

	return btcAddPendingTransaction(params);
};

export const getPendingBtcTransactions = async ({
	identity,
	...params
}: CanisterApiFunctionParams<BtcGetPendingTransactionParams>): Promise<PendingTransaction[]> => {
	const { btcGetPendingTransaction } = await backendCanister({ identity });

	return btcGetPendingTransaction(params);
};

export const selectUserUtxosFee = async ({
	identity,
	...params
}: CanisterApiFunctionParams<BtcSelectUserUtxosFeeParams>): Promise<SelectedUtxosFeeOutcome> => {
	const { btcSelectUserUtxosFee } = await backendCanister({ identity });

	return btcSelectUserUtxosFee(params);
};

export const getCurrentBtcFeePercentiles = async ({
	identity,
	...params
}: CanisterApiFunctionParams<BtcGetFeePercentilesParams>): Promise<BtcGetFeePercentilesResponse> => {
	const { btcGetCurrentFeePercentiles } = await backendCanister({ identity });

	return btcGetCurrentFeePercentiles(params);
};

export const getAllowedCycles = async ({
	identity
}: CanisterApiFunctionParams): Promise<GetAllowedCyclesResponse> => {
	const { getAllowedCycles } = await backendCanister({ identity });

	return getAllowedCycles();
};

export const allowSigning = async ({
	identity
}: CanisterApiFunctionParams): Promise<AllowSigningOutcome> => {
	const { allowSigning } = await backendCanister({ identity });

	return allowSigning();
};

export const addUserHiddenDappId = async ({
	identity,
	...params
}: CanisterApiFunctionParams<AddUserHiddenDappIdParams>): Promise<void> => {
	const { addUserHiddenDappId } = await backendCanister({ identity });

	return addUserHiddenDappId(params);
};

export const setUserShowTestnets = async ({
	identity,
	...params
}: CanisterApiFunctionParams<SetUserShowTestnetsParams>): Promise<void> => {
	const { setUserShowTestnets } = await backendCanister({ identity });

	return setUserShowTestnets(params);
};

export const updateUserNetworkSettings = async ({
	identity,
	...params
}: CanisterApiFunctionParams<SaveUserNetworksSettings>): Promise<void> => {
	const { updateUserNetworkSettings } = await backendCanister({ identity });

	return updateUserNetworkSettings(params);
};

export const updateUserAgreements = async ({
	identity,
	...params
}: CanisterApiFunctionParams<SaveUserAgreements>): Promise<void> => {
	const { updateUserAgreements } = await backendCanister({ identity });

	return updateUserAgreements(params);
};

export const getContact = async ({
	contactId,
	identity
}: CanisterApiFunctionParams<GetContactParams>): Promise<Contact> => {
	const { getContact } = await backendCanister({ identity });
	return getContact(contactId);
};

export const getContacts = async ({
	identity
}: CanisterApiFunctionParams<QueryParams>): Promise<Contact[]> => {
	const { getContacts } = await backendCanister({ identity });
	return getContacts();
};

export const createContact = async ({
	name,
	identity
}: CanisterApiFunctionParams<CreateContactParams>): Promise<Contact> => {
	const { createContact } = await backendCanister({ identity });
	return createContact(name);
};

export const updateContact = async ({
	contact,
	identity
}: CanisterApiFunctionParams<UpdateContactParams>): Promise<Contact> => {
	const { updateContact } = await backendCanister({ identity });
	return updateContact(contact);
};

export const deleteContact = async ({
	contactId,
	identity
}: CanisterApiFunctionParams<DeleteContactParams>): Promise<bigint> => {
	const { deleteContact } = await backendCanister({ identity });
	return deleteContact(contactId);
};

export const updateUserExperimentalFeatureSettings = async ({
	identity,
	...params
}: CanisterApiFunctionParams<UpdateUserExperimentalFeatureSettings>): Promise<void> => {
	const { updateUserExperimentalFeatureSettings } = await backendCanister({ identity });

	return updateUserExperimentalFeatureSettings(params);
};

const backendCanister = async ({
	identity,
	nullishIdentityErrorMessage,
	canisterId = BACKEND_CANISTER_ID
}: CanisterApiFunctionParams): Promise<BackendCanister> => {
	assertNonNullish(identity, nullishIdentityErrorMessage);

	if (isNullish(canister)) {
		canister = await BackendCanister.create({
			identity,
			canisterId: Principal.fromText(canisterId)
		});
	}

	return canister;
};
