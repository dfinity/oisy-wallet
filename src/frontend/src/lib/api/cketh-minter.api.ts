import { getAgent } from '$lib/actors/agents.ic';
import type { CanisterIdText } from '$lib/types/canister';
import type { Identity } from '@dfinity/agent';
import { CkETHMinterCanister } from '@dfinity/cketh';
import { Principal } from '@dfinity/principal';

export const ckEthMinterCanister = async ({
	identity,
	minterCanisterId
}: {
	identity: Identity;
	minterCanisterId: CanisterIdText;
}): Promise<CkETHMinterCanister> => {
	const agent = await getAgent({ identity });

	return CkETHMinterCanister.create({
		agent,
		canisterId: Principal.fromText(minterCanisterId)
	});
};
