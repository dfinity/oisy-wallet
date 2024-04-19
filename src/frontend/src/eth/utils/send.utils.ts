import type { ETH_ADDRESS } from '$lib/types/address';
import { nonNullish } from '@dfinity/utils';

export const isCkEthHelperContract = ({
	helperContractAddress,
	destination
}: {
	helperContractAddress: ETH_ADDRESS | null | undefined;
	destination: string | undefined;
}): boolean =>
	nonNullish(helperContractAddress) &&
	destination?.toLowerCase() === helperContractAddress.toLowerCase();
