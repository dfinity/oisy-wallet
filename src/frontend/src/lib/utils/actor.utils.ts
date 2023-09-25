import type { _SERVICE as AirdropActor } from '$declarations/airdrop/airdrop.did';
import { idlFactory as idlFactorAirdrop } from '$declarations/airdrop/airdrop.factory.did';
import type { _SERVICE as BackendActor } from '$declarations/backend/backend.did';
import { idlFactory as idlFactorBackend } from '$declarations/backend/backend.factory.did';
import { authStore } from '$lib/stores/auth.store';
import { getAgent } from '$lib/utils/agent.utils';
import { Actor, type ActorMethod, type ActorSubclass, type Identity } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';
import type { Principal } from '@dfinity/principal';
import { assertNonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const getBackendActor = async (): Promise<BackendActor> => {
	const identity: Identity | undefined | null = get(authStore).identity;

	assertNonNullish(identity, 'No internet identity.');

	const canisterId = import.meta.env.VITE_BACKEND_CANISTER_ID;

	return createActor({
		canisterId,
		idlFactory: idlFactorBackend,
		identity
	});
};

export const getAirdropActor = async (): Promise<AirdropActor> => {
	const identity: Identity | undefined | null = get(authStore).identity;

	assertNonNullish(identity, 'No internet identity.');

	const canisterId = import.meta.env.VITE_AIRDROP_CANISTER_ID;

	return createActor({
		canisterId,
		idlFactory: idlFactorAirdrop,
		identity
	});
};

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
