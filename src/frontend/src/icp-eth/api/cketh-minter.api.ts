import { getAgent } from '$lib/actors/agents.ic';
import type { CanisterIdText } from '$lib/types/canister';
import type { OptionIdentity } from '$lib/types/identity';
import type { Identity } from '@dfinity/agent';
import { CkETHMinterCanister, type MinterInfo } from '@dfinity/cketh';
import { Principal } from '@dfinity/principal';
import { assertNonNullish, type QueryParams } from '@dfinity/utils';

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
