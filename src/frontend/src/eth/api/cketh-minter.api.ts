import { ckEthMinterCanister } from '$lib/api/cketh-minter.api';
import type { ETH_ADDRESS } from '$lib/types/address';
import type { CanisterIdText } from '$lib/types/canister';
import type { OptionIdentity } from '$lib/types/identity';
import { assertNonNullish, type QueryParams } from '@dfinity/utils';

export const ckEthHelperContractAddress = async ({
	identity,
	minterCanisterId,
	certified
}: {
	identity: OptionIdentity;
	minterCanisterId: CanisterIdText;
} & QueryParams): Promise<ETH_ADDRESS> => {
	assertNonNullish(identity, 'No internet identity.');

	const { getSmartContractAddress } = await ckEthMinterCanister({ identity, minterCanisterId });

	return getSmartContractAddress({ certified });
};
