import { getAgent } from '$lib/actors/agents.ic';
import type { CanisterIdText } from '$lib/types/canister';
import type { OptionIdentity } from '$lib/types/identity';
import type { Identity } from '@dfinity/agent';
import type { MinterInfo, RetrieveBtcOk, UpdateBalanceOk } from '@dfinity/ckbtc';
import { CkBTCMinterCanister } from '@dfinity/ckbtc';
import { Principal } from '@dfinity/principal';
import { assertNonNullish, type QueryParams } from '@dfinity/utils';

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

	return updateBalance(minterAccountParams({ identity }));
};

export const minterInfo = async ({
	identity,
	minterCanisterId,
	...rest
}: {
	identity: OptionIdentity;
	minterCanisterId: CanisterIdText;
} & QueryParams): Promise<MinterInfo> => {
	assertNonNullish(identity, 'No internet identity.');

	const { getMinterInfo } = await minterCanister({ identity, minterCanisterId });

	return getMinterInfo(rest);
};

export const getBtcAddress = async ({
	identity,
	minterCanisterId
}: {
	identity: OptionIdentity;
	minterCanisterId: CanisterIdText;
}): Promise<string> => {
	assertNonNullish(identity, 'No internet identity.');

	const { getBtcAddress } = await minterCanister({ identity, minterCanisterId });

	return getBtcAddress(minterAccountParams({ identity }));
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

const minterAccountParams = ({ identity }: { identity: Identity }): { owner: Principal } => {
	// We use the identity to follow NNS-dapp's scheme but, if it would not be provided, it would be the same result.
	// If "owner" is not provided, the minter canister uses the "caller" as a fallback.
	return {
		owner: identity.getPrincipal()
	};
};
