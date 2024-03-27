import { getAgent } from '$lib/actors/agents.ic';
import { i18n } from '$lib/stores/i18n.store';
import type { ETH_ADDRESS } from '$lib/types/address';
import type { CanisterIdText } from '$lib/types/canister';
import type { OptionIdentity } from '$lib/types/identity';
import type { Identity } from '@dfinity/agent';
import { CkETHMinterCanister } from '@dfinity/cketh';
import { Principal } from '@dfinity/principal';
import { assertNonNullish, type QueryParams } from '@dfinity/utils';
import { get } from 'svelte/store';

export const ckEthHelperContractAddress = async ({
	identity,
	minterCanisterId,
	certified
}: {
	identity: OptionIdentity;
	minterCanisterId: CanisterIdText;
} & QueryParams): Promise<ETH_ADDRESS> => {
	assertNonNullish(identity, get(i18n).auth.error.no_internet_identity);

	const { getSmartContractAddress } = await ckEthMinterCanister({ identity, minterCanisterId });

	return getSmartContractAddress({ certified });
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
