import type {
	CustomToken,
	SignRequest,
	UserToken,
	UserTokenId
} from '$declarations/backend/backend.did';
import { getBackendActor } from '$lib/actors/actors.ic';
import type { ECDSA_PUBLIC_KEY } from '$lib/types/address';
import type { OptionIdentity } from '$lib/types/identity';
import type { Identity } from '@dfinity/agent';
import type { QueryParams } from '@dfinity/utils';

export const getEthAddress = async (identity: OptionIdentity): Promise<ECDSA_PUBLIC_KEY> => {
	const { caller_eth_address } = await getBackendActor({ identity });
	return caller_eth_address();
};

export const signTransaction = async ({
	transaction,
	identity
}: {
	transaction: SignRequest;
	identity: OptionIdentity;
}): Promise<string> => {
	const { sign_transaction } = await getBackendActor({ identity });
	return sign_transaction(transaction);
};

export const signMessage = async ({
	message,
	identity
}: {
	message: string;
	identity: OptionIdentity;
}): Promise<string> => {
	const { personal_sign } = await getBackendActor({ identity });
	return personal_sign(message);
};

export const signPrehash = async ({
	hash,
	identity
}: {
	hash: string;
	identity: OptionIdentity;
}): Promise<string> => {
	const { sign_prehash } = await getBackendActor({ identity });
	return sign_prehash(hash);
};

export const addUserToken = async ({
	token,
	identity
}: {
	token: UserToken;
	identity: Identity;
}): Promise<void> => {
	const { add_user_token } = await getBackendActor({ identity });
	return add_user_token(token);
};

export const removeUserToken = async ({
	tokenId,
	identity
}: {
	tokenId: UserTokenId;
	identity: Identity;
}): Promise<void> => {
	const { remove_user_token } = await getBackendActor({ identity });
	return remove_user_token(tokenId);
};

export const listUserTokens = async ({
	identity
}: {
	identity: Identity;
}): Promise<UserToken[]> => {
	const { list_user_tokens } = await getBackendActor({ identity });
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
