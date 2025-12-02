import { getAgent } from '$lib/actors/agents.ic';
import type { CanisterIdText } from '$lib/types/canister';
import type { OptionIdentity } from '$lib/types/identity';
import { assertNonNullish, type QueryParams } from '@dfinity/utils';
import { CkETHMinterCanister, type MinterInfo } from '@icp-sdk/canisters/cketh';
import type { Identity } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';

export const minterInfo = async ({
	identity,
	minterCanisterId,
	...rest
}: {
	identity: OptionIdentity;
	minterCanisterId: CanisterIdText;
} & QueryParams): Promise<MinterInfo> => {
	assertNonNullish(identity);

	const { getMinterInfo } = await ckEthMinterCanister({ identity, minterCanisterId });

	return getMinterInfo(rest);
};

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
