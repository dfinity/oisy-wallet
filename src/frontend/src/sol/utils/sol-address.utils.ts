import type { Address, SolAddress } from '$lib/types/address';
import type { OptionIdentity } from '$lib/types/identity';
import { getAccountOwner } from '$sol/api/solana.api';
import type { SolanaNetworkType } from '$sol/types/network';
import { isNullish, nonNullish } from '@dfinity/utils';
import { assertIsAddress } from '@solana/kit';

export const isSolAddress = (address: Address | undefined): boolean => {
	if (isNullish(address)) {
		return false;
	}

	try {
		assertIsAddress(address);
		return true;
	} catch (_: unknown) {
		return false;
	}
};

export const invalidSolAddress = (address: Address | undefined): boolean => !isSolAddress(address);

export const isAtaAddress = async ({
	identity,
	address,
	network
}: {
	identity: OptionIdentity;
	address: SolAddress;
	network: SolanaNetworkType;
}): Promise<boolean> => {
	const accountOwner = await getAccountOwner({ identity, address, network });

	return nonNullish(accountOwner);
};
