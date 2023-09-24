import type { SignRequest } from '$declarations/backend/backend.did';
import type { ECDSA_PUBLIC_KEY } from '$lib/types/address';
import { getBackendActor } from '$lib/utils/actor.utils';

export const getEthAddress = async (): Promise<ECDSA_PUBLIC_KEY> => {
	const actor = await getBackendActor();
	return actor.caller_eth_address();
};

export const signTransaction = async (transaction: SignRequest): Promise<string> => {
	const actor = await getBackendActor();
	return actor.sign_transaction(transaction);
};

export const signMessage = async (message: string): Promise<string> => {
	const actor = await getBackendActor();
	return actor.personal_sign(message);
};

export const signPrehash = async (hash: string): Promise<string> => {
	const actor = await getBackendActor();
	return actor.sign_prehash(hash);
};
