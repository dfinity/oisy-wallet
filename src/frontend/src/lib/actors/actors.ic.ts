import type { _SERVICE as AirdropActor } from '$declarations/airdrop/airdrop.did';
import { idlFactory as idlFactorAirdrop } from '$declarations/airdrop/airdrop.factory.did';
import type { _SERVICE as BackendActor } from '$declarations/backend/backend.did';
import { idlFactory as idlFactorBackend } from '$declarations/backend/backend.factory.did';
import { AIRDOP_CANISTER_ID, BACKEND_CANISTER_ID } from '$lib/constants/app.constants';
import type { OptionIdentity } from '$lib/types/identity';
import { Actor, type ActorMethod, type ActorSubclass, type Identity } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';
import type { Principal } from '@dfinity/principal';
import { assertNonNullish, isNullish } from '@dfinity/utils';
import { getAgent } from './agents.ic';

let actors: { backend?: BackendActor; airdrop?: AirdropActor } | undefined | null = undefined;

export const getBackendActor = async ({
	identity
}: {
	identity: OptionIdentity;
}): Promise<BackendActor> => {
	assertNonNullish(identity, 'No internet identity.');

	const { backend } = actors ?? { backend: undefined };

	if (isNullish(backend)) {
		const actor = await createActor<BackendActor>({
			canisterId: BACKEND_CANISTER_ID,
			idlFactory: idlFactorBackend,
			identity
		});

		actors = {
			...(actors ?? {}),
			backend: actor
		};

		return actor;
	}

	return backend;
};

export const getAirdropActor = async ({
	identity
}: {
	identity: OptionIdentity;
}): Promise<AirdropActor> => {
	assertNonNullish(identity, 'No internet identity.');

	const { airdrop } = actors ?? { airdrop: undefined };

	if (isNullish(airdrop)) {
		const actor = await createActor<AirdropActor>({
			canisterId: AIRDOP_CANISTER_ID,
			idlFactory: idlFactorAirdrop,
			identity
		});

		actors = {
			...(actors ?? {}),
			airdrop: actor
		};

		return actor;
	}

	return airdrop;
};

export const clearActors = () => (actors = null);

const createActor = async <T = Record<string, ActorMethod>>({
	canisterId,
	idlFactory,
	identity
}: {
	canisterId: string | Principal;
	idlFactory: IDL.InterfaceFactory;
	identity: Identity;
}): Promise<ActorSubclass<T>> => {
	const agent = await getAgent({ identity });

	// Creates an actor with using the candid interface and the HttpAgent
	return Actor.createActor(idlFactory, {
		agent,
		canisterId
	});
};
