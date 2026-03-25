import type {
	AddUserCredentialResult,
	BtcGetFeePercentilesResponse,
	Contact,
	CustomToken,
	GetAllowedCyclesResponse,
	TokenId,
	UserProfile
} from '$declarations/backend/backend.did';
import { CanisterApi } from '$lib/api/canister.api';
import { BackendCanister } from '$lib/canisters/backend.canister';
import { BACKEND_CANISTER_ID } from '$lib/constants/app.constants';
import type {
	AddPendingTransactionOutcome,
	AddUserCredentialParams,
	AddUserHiddenDappIdParams,
	AllowSigningOutcome,
	AllowSigningParams,
	BtcAddPendingTransactionParams,
	BtcGetFeePercentilesParams,
	BtcGetPendingTransactionParams,
	BtcSelectUserUtxosFeeParams,
	CreateContactParams,
	DeleteContactParams,
	GetContactParams,
	GetPendingTransactionsOutcome,
	GetUserProfileResponse,
	GetUserTransactionsParams,
	GetUserTransactionsResponse,
	SaveUserAgreements,
	SaveUserNetworksSettings,
	SaveUserTransactionsParams,
	SelectedUtxosFeeOutcome,
	SetUserShowTestnetsParams,
	UpdateContactParams,
	UpdateUserExperimentalFeatureSettings
} from '$lib/types/api';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import type { BackendExchangeRate } from '$lib/types/exchange';
import { assertNonNullish, type QueryParams } from '@dfinity/utils';

const backendApi = new CanisterApi<BackendCanister>();

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
}: CanisterApiFunctionParams<BtcGetPendingTransactionParams>): Promise<GetPendingTransactionsOutcome> => {
	const { btcGetPendingTransactions } = await backendCanister({ identity });

	return btcGetPendingTransactions(params);
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
	identity,
	...params
}: CanisterApiFunctionParams<AllowSigningParams>): Promise<AllowSigningOutcome> => {
	const { allowSigning } = await backendCanister({ identity });

	return allowSigning(params);
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

export const getExchangeRate = async ({
	identity,
	...params
}: CanisterApiFunctionParams<{
	token_id: TokenId;
	certified: boolean;
}>): Promise<BackendExchangeRate | undefined> => {
	const { getExchangeRate } = await backendCanister({ identity });

	return getExchangeRate(params);
};

export const getExchangeRates = async ({
	identity,
	...params
}: CanisterApiFunctionParams<{
	token_ids: TokenId[];
	certified: boolean;
}>): Promise<Map<string, BackendExchangeRate>> => {
	const { getExchangeRates } = await backendCanister({ identity });

	return getExchangeRates(params);
};

export const getUserTransactions = async ({
	identity,
	...params
}: CanisterApiFunctionParams<GetUserTransactionsParams>): Promise<GetUserTransactionsResponse> => {
	const { getUserTransactions } = await backendCanister({ identity });

	return getUserTransactions(params);
};

export const saveUserTransactions = async ({
	identity,
	...params
}: CanisterApiFunctionParams<SaveUserTransactionsParams>): Promise<void> => {
	const { saveUserTransactions } = await backendCanister({ identity });

	return saveUserTransactions(params);
};

const backendCanister = async ({
	identity,
	nullishIdentityErrorMessage,
	canisterId = BACKEND_CANISTER_ID
}: CanisterApiFunctionParams): Promise<BackendCanister> => {
	assertNonNullish(identity, nullishIdentityErrorMessage);

	return await backendApi.getCanister({
		identity,
		canisterId,
		create: BackendCanister.create
	});
};
