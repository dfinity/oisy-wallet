import { getAgent } from '$lib/actors/agents.ic';
import type { CanisterIdText } from '$lib/types/canister';
import type { OptionIdentity } from '$lib/types/identity';
import type { Identity } from '@dfinity/agent';
import { CkBTCMinterCanister } from '@dfinity/ckbtc';
import type { RetrieveBtcOk } from '@dfinity/ckbtc';
import { Principal } from '@dfinity/principal';
import { assertNonNullish } from '@dfinity/utils';

export const retrieveBtc = async ({
	identity,
	minterCanisterId,
	...params
}: {
	identity: OptionIdentity;
	minterCanisterId: CanisterIdText;
	amount: bigint;
	address: string;
}): Promise<RetrieveBtcOk> => {
	assertNonNullish(identity, 'No internet identity.');

	const { retrieveBtcWithApproval } = await minterCanister({ identity, minterCanisterId });

	return retrieveBtcWithApproval(params);
};

const minterCanister = async ({
	identity,
	minterCanisterId
}: {
	identity: Identity;
	minterCanisterId: CanisterIdText;
}): Promise<CkBTCMinterCanister> => {
	const agent = await getAgent({ identity });

	return CkBTCMinterCanister.create({
		agent,
		canisterId: Principal.fromText(minterCanisterId)
	});
};
