import type {
	CustomToken,
	PendingTransaction,
	SelectedUtxosFeeResponse,
	UserProfile,
	UserToken
} from '$declarations/backend/backend.did';
import { BackendCanister } from '$lib/canisters/backend.canister';
import { BACKEND_CANISTER_ID } from '$lib/constants/app.constants';
import type {
	AddUserCredentialParams,
	AddUserCredentialResponse,
	BtcAddPendingTransactionParams,
	BtcGetPendingTransactionParams,
	BtcSelectUserUtxosFeeParams,
	GetUserProfileResponse
} from '$lib/types/api';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import { Principal } from '@dfinity/principal';
import { assertNonNullish, isNullish, type QueryParams } from '@dfinity/utils';

let canister: BackendCanister | undefined = undefined;

export const listUserTokens = async ({
	identity,
	certified
}: CanisterApiFunctionParams<QueryParams>): Promise<UserToken[]> => {
	const { listUserTokens } = await backendCanister({ identity });

	return listUserTokens({ certified });
};

export const listCustomTokens = async ({
	identity,
	certified
}: CanisterApiFunctionParams<QueryParams>): Promise<CustomToken[]> => {
	const { listCustomTokens } = await backendCanister({ identity });

	return listCustomTokens({ certified });
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

export const setManyUserTokens = async ({
	identity,
	tokens
}: CanisterApiFunctionParams<{ tokens: UserToken[] }>): Promise<void> => {
	const { setManyUserTokens } = await backendCanister({ identity });

	return setManyUserTokens({ tokens });
};

export const setUserToken = async ({
	token,
	identity
}: CanisterApiFunctionParams<{
	token: UserToken;
}>): Promise<void> => {
	const { setUserToken } = await backendCanister({ identity });

	return setUserToken({ token });
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
}: CanisterApiFunctionParams<AddUserCredentialParams>): Promise<AddUserCredentialResponse> => {
	const { addUserCredential } = await backendCanister({ identity });

	return addUserCredential(params);
};

export const addPendingBtcTransaction = async ({
	identity,
	...params
}: CanisterApiFunctionParams<BtcAddPendingTransactionParams>): Promise<boolean> => {
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
}: CanisterApiFunctionParams<BtcSelectUserUtxosFeeParams>): Promise<SelectedUtxosFeeResponse> => {
	const { btcSelectUserUtxosFee } = await backendCanister({ identity });

	return btcSelectUserUtxosFee(params);
};

export const allowSigning = async ({ identity }: CanisterApiFunctionParams): Promise<void> => {
	const { allowSigning } = await backendCanister({ identity });

	return allowSigning();
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
