import type { SignRequest, Token } from '$declarations/backend/backend.did';
import { getBackendActor } from '$lib/ic/actor.ic';
import type { ECDSA_PUBLIC_KEY } from '$lib/types/address';
import type { OptionIdentity } from '$lib/types/identity';
import type { Identity } from '@dfinity/agent';

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
	token: Token;
	identity: Identity;
}): Promise<void> => {
	const { add_user_token } = await getBackendActor({ identity });
	return add_user_token(token);
};

export const listUserTokens = async ({ identity }: { identity: Identity }): Promise<Token[]> => {
	const { list_user_tokens } = await getBackendActor({ identity });
	return list_user_tokens();
};
