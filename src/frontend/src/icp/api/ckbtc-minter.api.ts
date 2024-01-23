import { getAgent } from '$lib/actors/agents.ic';
import type { CanisterIdText } from '$lib/types/canister';
import type { OptionIdentity } from '$lib/types/identity';
import type { Identity } from '@dfinity/agent';
import type { RetrieveBtcOk, UpdateBalanceOk } from '@dfinity/ckbtc';
import { CkBTCMinterCanister } from '@dfinity/ckbtc';
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

export const updateBalance = async ({
	identity,
	minterCanisterId
}: {
	identity: OptionIdentity;
	minterCanisterId: CanisterIdText;
}): Promise<UpdateBalanceOk> => {
	assertNonNullish(identity, 'No internet identity.');

	const { updateBalance } = await minterCanister({ identity, minterCanisterId });

	// We use the identity to follow NNS-dapp's scheme but, if it would not be provided, it would be the same result.
	// If "owner" is not provided, the minter canister uses the "caller" as a fallback.
	return updateBalance({
		owner: identity.getPrincipal()
	});
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
