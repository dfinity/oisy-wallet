import { getAgent } from '$lib/actors/agents.ic';
import type { CanisterIdText } from '$lib/types/canister';
import type { OptionIdentity } from '$lib/types/identity';
import type { Identity } from '@dfinity/agent';
import { CkETHMinterCanister } from '@dfinity/cketh';
import type { RetrieveEthRequest } from '@dfinity/cketh/dist/candid/minter';
import { Principal } from '@dfinity/principal';
import { assertNonNullish } from '@dfinity/utils';

export const withdrawEth = async ({
	identity,
	minterCanisterId,
	...params
}: {
	identity: OptionIdentity;
	minterCanisterId: CanisterIdText;
	amount: bigint;
	address: string;
}): Promise<RetrieveEthRequest> => {
	assertNonNullish(identity, 'No internet identity.');

	const { withdrawEth } = await minterCanister({ identity, minterCanisterId });

	return withdrawEth(params);
};

const minterCanister = async ({
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
