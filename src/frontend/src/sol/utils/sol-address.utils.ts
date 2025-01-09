import type { SolAddress } from '$lib/types/address';
import { isNullish } from '@dfinity/utils';
import { assertIsAddress } from '@solana/addresses';

export const isSolAddress = (address: SolAddress | undefined): boolean => {
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

export const invalidSolAddress = (address: SolAddress | undefined): boolean =>
	!isSolAddress(address);
