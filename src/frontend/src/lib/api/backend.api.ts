import type { CustomToken, UserProfile, UserToken } from '$declarations/backend/backend.did';
import { BackendCanister } from '$lib/canisters/backend.canister';
import { BACKEND_CANISTER_ID } from '$lib/constants/app.constants';
import type {
	AddUserCredentialParams,
	AddUserCredentialResponse,
	GetUserProfileResponse
} from '$lib/types/api';
import type { CommonCanisterApiFunctionParams } from '$lib/types/canister';
import { Principal } from '@dfinity/principal';
import { assertNonNullish, isNullish, type QueryParams } from '@dfinity/utils';

let canister: BackendCanister | undefined = undefined;

export const listUserTokens = async ({
	identity,
	certified = true
}: CommonCanisterApiFunctionParams<QueryParams>): Promise<UserToken[]> => {
	const { listUserTokens } = await backendCanister({ identity });

	return listUserTokens({ certified });
};

export const listCustomTokens = async ({
	identity,
	certified = true
}: CommonCanisterApiFunctionParams<QueryParams>): Promise<CustomToken[]> => {
	const { listCustomTokens } = await backendCanister({ identity });

	return listCustomTokens({ certified });
};

export const setManyCustomTokens = async ({
	identity,
	tokens
}: CommonCanisterApiFunctionParams<{
	tokens: CustomToken[];
}>): Promise<void> => {
	const { setManyCustomTokens } = await backendCanister({ identity });

	return setManyCustomTokens({ tokens });
};

export const setCustomToken = async ({
	token,
	identity
}: CommonCanisterApiFunctionParams<{
	token: CustomToken;
}>): Promise<void> => {
	const { setCustomToken } = await backendCanister({ identity });

	return setCustomToken({ token });
};

export const setManyUserTokens = async ({
	identity,
	tokens
}: CommonCanisterApiFunctionParams<{ tokens: UserToken[] }>): Promise<void> => {
	const { setManyUserTokens } = await backendCanister({ identity });

	return setManyUserTokens({ tokens });
};

export const setUserToken = async ({
	token,
	identity
}: CommonCanisterApiFunctionParams<{
	token: UserToken;
}>): Promise<void> => {
	const { setUserToken } = await backendCanister({ identity });

	return setUserToken({ token });
};

export const createUserProfile = async ({
	identity
}: CommonCanisterApiFunctionParams): Promise<UserProfile> => {
	const { createUserProfile } = await backendCanister({ identity });

	return createUserProfile();
};

export const getUserProfile = async ({
	identity,
	certified = true
}: CommonCanisterApiFunctionParams<QueryParams>): Promise<GetUserProfileResponse> => {
	const { getUserProfile } = await backendCanister({ identity });

	return getUserProfile({ certified });
};
export const addUserCredential = async ({
	identity,
	...params
}: CommonCanisterApiFunctionParams<AddUserCredentialParams>): Promise<AddUserCredentialResponse> => {
	const { addUserCredential } = await backendCanister({ identity });

	return addUserCredential(params);
};

const backendCanister = async ({
	identity,
	nullishIdentityErrorMessage,
	canisterId = BACKEND_CANISTER_ID
}: CommonCanisterApiFunctionParams): Promise<BackendCanister> => {
	assertNonNullish(identity, nullishIdentityErrorMessage);

	if (isNullish(canister)) {
		canister = await BackendCanister.create({
			identity,
			canisterId: Principal.fromText(canisterId)
		});
	}

	return canister;
};
