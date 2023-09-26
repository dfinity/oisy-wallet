import type { SignRequest } from '$declarations/backend/backend.did';
import type { ECDSA_PUBLIC_KEY } from '$lib/types/address';
import type { OptionIdentity } from '$lib/types/identity';
import { getBackendActor } from '$lib/utils/actor.utils';

export const getEthAddress = async (identity: OptionIdentity): Promise<ECDSA_PUBLIC_KEY> => {
	const actor = await getBackendActor(identity);
	return actor.caller_eth_address();
};

export const signTransaction = async ({
	transaction,
	identity
}: {
	transaction: SignRequest;
	identity: OptionIdentity;
}): Promise<string> => {
	const actor = await getBackendActor(identity);
	return actor.sign_transaction(transaction);
};

export const signMessage = async ({
	message,
	identity
}: {
	message: string;
	identity: OptionIdentity;
}): Promise<string> => {
	const actor = await getBackendActor(identity);
	return actor.personal_sign(message);
};

export const signPrehash = async ({
	hash,
	identity
}: {
	hash: string;
	identity: OptionIdentity;
}): Promise<string> => {
	const actor = await getBackendActor(identity);
	return actor.sign_prehash(hash);
};
