import type { _SERVICE as AirdropActor, Result_3 } from '$declarations/airdrop/airdrop.did';
import { idlFactory as idlFactorAirdrop } from '$declarations/airdrop/airdrop.factory.did';
import { getAgent } from '$lib/worker-utils/agent.worker-utils';
import type { Identity } from '@dfinity/agent';
import { Actor, type ActorMethod, type ActorSubclass } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';
import type { Principal } from '@dfinity/principal';

// TODO: this duplicate codes of airdrop.api.ts only because building the HttpAgent with ESM to create the actor leads to an error.

const getAirdropActor = async (identity: Identity): Promise<AirdropActor> => {
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

export const getAirdropCode = async (identity: Identity): Promise<Result_3> => {
	const actor = await getAirdropActor(identity);
	return actor.get_code();
};
