import type { ETH_ADDRESS } from '$lib/types/address';
import { nonNullish } from '@dfinity/utils';

export const isCkEthHelperContract = ({
	contractAddress,
	destination
}: {
	contractAddress: ETH_ADDRESS | null | undefined;
	destination: string | undefined;
}): boolean =>
	nonNullish(contractAddress) &&
	destination?.toLowerCase() === contractAddress.toLowerCase();
