import type {
	AddUserCredentialError,
	CredentialSpec,
	CustomToken,
	GetUserProfileError,
	UserProfile,
	UserToken
} from '$declarations/backend/backend.did';
import { getBackendActor } from '$lib/actors/actors.ic';
import type { OptionIdentity } from '$lib/types/identity';
import type { Identity } from '@dfinity/agent';
import type { Principal } from '@dfinity/principal';
import { toNullable, type QueryParams } from '@dfinity/utils';

export const listUserTokens = async ({
	identity,
	certified = true
}: { identity: OptionIdentity } & QueryParams): Promise<UserToken[]> => {
	const { list_user_tokens } = await getBackendActor({ identity, certified });
	return list_user_tokens();
};

export const listCustomTokens = async ({
	identity,
	certified = true
}: { identity: OptionIdentity } & QueryParams): Promise<CustomToken[]> => {
	const { list_custom_tokens } = await getBackendActor({ identity, certified });
	return list_custom_tokens();
};

export const setManyCustomTokens = async ({
	tokens,
	identity
}: {
	tokens: CustomToken[];
	identity: Identity;
}): Promise<void> => {
	const { set_many_custom_tokens } = await getBackendActor({ identity });
	return set_many_custom_tokens(tokens);
};

export const setCustomToken = async ({
	token,
	identity
}: {
	token: CustomToken;
	identity: Identity;
}): Promise<void> => {
	const { set_custom_token } = await getBackendActor({ identity });
	return set_custom_token(token);
};

export const setManyUserTokens = async ({
	tokens,
	identity
}: {
	tokens: UserToken[];
	identity: Identity;
}): Promise<void> => {
	const { set_many_user_tokens } = await getBackendActor({ identity });
	return set_many_user_tokens(tokens);
};

export const setUserToken = async ({
	token,
	identity
}: {
	token: UserToken;
	identity: Identity;
}): Promise<void> => {
	const { set_user_token } = await getBackendActor({ identity });
	return set_user_token(token);
};

export const createUserProfile = async ({
	identity
}: {
	identity: OptionIdentity;
}): Promise<UserProfile> => {
	const { create_user_profile } = await getBackendActor({ identity });
	return create_user_profile();
};

export const getUserProfile = async ({
	identity,
	certified = true
}: { identity: OptionIdentity } & QueryParams): Promise<
	{ Ok: UserProfile } | { Err: GetUserProfileError }
> => {
	const { get_user_profile } = await getBackendActor({ identity, certified });
	return get_user_profile();
};

export const addUserCredential = async ({
	identity,
	credentialJwt,
	issuerCanisterId,
	currentUserVersion,
	credentialSpec
}: {
	identity: Identity;
	credentialJwt: string;
	issuerCanisterId: Principal;
	currentUserVersion?: bigint;
	credentialSpec: CredentialSpec;
}): Promise<{ Ok: null } | { Err: AddUserCredentialError }> => {
	const { add_user_credential } = await getBackendActor({ identity });
	return add_user_credential({
		credential_jwt: credentialJwt,
		issuer_canister_id: issuerCanisterId,
		current_user_version: toNullable(currentUserVersion),
		credential_spec: credentialSpec
	});
};
