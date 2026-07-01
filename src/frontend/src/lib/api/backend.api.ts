import type {
	ActiveUserTransaction,
	BtcGetFeePercentilesResponse,
	Contact,
	CreatePersonalNoteShareRequest,
	CustomToken,
	DeletePersonalNoteRequest,
	GetAllowedCyclesResponse,
	PersonalNoteEntry,
	PersonalNoteShareContent,
	PersonalNoteSharePeek,
	SignOnramperWidgetUrlResponse,
	TokenId
} from '$declarations/backend/backend.did';
import { CanisterApi } from '$lib/api/canister.api';
import { BackendCanister } from '$lib/canisters/backend.canister';
import { BACKEND_CANISTER_ID } from '$lib/constants/app.constants';
import type {
	AddPendingTransactionOutcome,
	AddUserDismissedNotificationParams,
	AddUserHiddenDappIdParams,
	AllowSigningOutcome,
	AllowSigningParams,
	BtcAddPendingTransactionParams,
	BtcGetFeePercentilesParams,
	BtcGetPendingTransactionParams,
	CreateActiveUserTransactionParams,
	CreateContactParams,
	CreateUserProfileResponse,
	DeleteContactParams,
	GetContactParams,
	GetPendingTransactionsOutcome,
	GetUserProfileResponse,
	GetUserTransactionsParams,
	GetUserTransactionsResponse,
	SaveProviderAgreements,
	SaveUserAgreements,
	SaveUserNetworksSettings,
	SaveUserTransactionsParams,
	SetUserShowTestnetsParams,
	SignOnramperWidgetUrlParams,
	UpdateActiveUserTransactionParams,
	UpdateContactParams,
	UpdateUserExperimentalFeatureSettings,
	UpdateUserTransactionFilterSettings
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
}: CanisterApiFunctionParams): Promise<CreateUserProfileResponse> => {
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

export const newUserSignupsAllowed = async ({
	identity,
	certified
}: CanisterApiFunctionParams<QueryParams>): Promise<boolean> => {
	const { newUserSignupsAllowed } = await backendCanister({ identity });

	return newUserSignupsAllowed({ certified });
};

export const exchangeRateEnabled = async ({
	identity,
	certified
}: CanisterApiFunctionParams<QueryParams>): Promise<boolean> => {
	const { exchangeRateEnabled } = await backendCanister({ identity });

	return exchangeRateEnabled({ certified });
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

export const signOnramperWidgetUrl = async ({
	identity,
	...params
}: CanisterApiFunctionParams<SignOnramperWidgetUrlParams>): Promise<SignOnramperWidgetUrlResponse> => {
	const { signOnramperWidgetUrl } = await backendCanister({ identity });

	return signOnramperWidgetUrl(params);
};

export const addUserHiddenDappId = async ({
	identity,
	...params
}: CanisterApiFunctionParams<AddUserHiddenDappIdParams>): Promise<void> => {
	const { addUserHiddenDappId } = await backendCanister({ identity });

	return addUserHiddenDappId(params);
};

export const addUserDismissedNotification = async ({
	identity,
	...params
}: CanisterApiFunctionParams<AddUserDismissedNotificationParams>): Promise<void> => {
	const { addUserDismissedNotification } = await backendCanister({ identity });

	return addUserDismissedNotification(params);
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

export const updateProviderAgreements = async ({
	identity,
	...params
}: CanisterApiFunctionParams<SaveProviderAgreements>): Promise<void> => {
	const { updateProviderAgreements } = await backendCanister({ identity });

	return updateProviderAgreements(params);
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

export const updateUserTransactionFilterSettings = async ({
	identity,
	...params
}: CanisterApiFunctionParams<UpdateUserTransactionFilterSettings>): Promise<void> => {
	const { updateUserTransactionFilterSettings } = await backendCanister({ identity });

	return updateUserTransactionFilterSettings(params);
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
	identity
}: CanisterApiFunctionParams): Promise<Array<[TokenId, BackendExchangeRate | undefined]>> => {
	const { getExchangeRates } = await backendCanister({ identity });

	return getExchangeRates();
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

export const createActiveUserTransaction = async ({
	identity,
	...params
}: CanisterApiFunctionParams<CreateActiveUserTransactionParams>): Promise<ActiveUserTransaction> => {
	const { createActiveUserTransaction } = await backendCanister({ identity });

	return createActiveUserTransaction(params);
};

export const updateActiveUserTransaction = async ({
	identity,
	...params
}: CanisterApiFunctionParams<UpdateActiveUserTransactionParams>): Promise<ActiveUserTransaction> => {
	const { updateActiveUserTransaction } = await backendCanister({ identity });

	return updateActiveUserTransaction(params);
};

export const deleteActiveUserTransaction = async ({
	identity,
	id
}: CanisterApiFunctionParams<{ id: string }>): Promise<void> => {
	const { deleteActiveUserTransaction } = await backendCanister({ identity });

	return deleteActiveUserTransaction(id);
};

export const getActiveUserTransactions = async ({
	identity
}: CanisterApiFunctionParams): Promise<ActiveUserTransaction[]> => {
	const { getActiveUserTransactions } = await backendCanister({ identity });

	return getActiveUserTransactions();
};

export const setPersonalNote = async ({
	identity,
	...request
}: CanisterApiFunctionParams<PersonalNoteEntry>): Promise<void> => {
	const { setPersonalNote } = await backendCanister({ identity });
	return setPersonalNote(request);
};

export const deletePersonalNote = async ({
	identity,
	...request
}: CanisterApiFunctionParams<DeletePersonalNoteRequest>): Promise<void> => {
	const { deletePersonalNote } = await backendCanister({ identity });
	return deletePersonalNote(request);
};

export const getPersonalNotes = async ({
	identity
}: CanisterApiFunctionParams): Promise<PersonalNoteEntry[]> => {
	const { getPersonalNotes } = await backendCanister({ identity });
	return getPersonalNotes();
};

export const getPersonalNotesCount = async ({
	identity
}: CanisterApiFunctionParams): Promise<bigint> => {
	const { getPersonalNotesCount } = await backendCanister({ identity });
	return getPersonalNotesCount();
};

export const getPersonalNotesEncryptedVetkey = async ({
	identity,
	transportPublicKey
}: CanisterApiFunctionParams<{
	transportPublicKey: Uint8Array;
}>): Promise<Uint8Array | number[]> => {
	const { getPersonalNotesEncryptedVetkey } = await backendCanister({ identity });
	return getPersonalNotesEncryptedVetkey(transportPublicKey);
};

export const getPersonalNotesVetkeyPublicKey = async ({
	identity
}: CanisterApiFunctionParams): Promise<Uint8Array | number[]> => {
	const { getPersonalNotesVetkeyPublicKey } = await backendCanister({ identity });
	return getPersonalNotesVetkeyPublicKey();
};

export const createPersonalNoteShare = async ({
	identity,
	...request
}: CanisterApiFunctionParams<CreatePersonalNoteShareRequest>): Promise<void> => {
	const { createPersonalNoteShare } = await backendCanister({ identity });
	return createPersonalNoteShare(request);
};

export const peekPersonalNoteShare = async ({
	identity,
	token
}: CanisterApiFunctionParams<{ token: string }>): Promise<PersonalNoteSharePeek> => {
	const { peekPersonalNoteShare } = await backendCanister({ identity });
	return peekPersonalNoteShare(token);
};

export const getPersonalNoteShare = async ({
	identity,
	token
}: CanisterApiFunctionParams<{ token: string }>): Promise<PersonalNoteShareContent> => {
	const { getPersonalNoteShare } = await backendCanister({ identity });
	return getPersonalNoteShare(token);
};

export const consumePersonalNoteShare = async ({
	identity,
	token
}: CanisterApiFunctionParams<{ token: string }>): Promise<PersonalNoteShareContent> => {
	const { consumePersonalNoteShare } = await backendCanister({ identity });
	return consumePersonalNoteShare(token);
};

export const getPersonalNoteSharesCount = async ({
	identity
}: CanisterApiFunctionParams): Promise<bigint> => {
	const { getPersonalNoteSharesCount } = await backendCanister({ identity });
	return getPersonalNoteSharesCount();
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
