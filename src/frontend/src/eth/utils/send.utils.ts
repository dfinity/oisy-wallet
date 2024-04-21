import type { OptionAddress } from '$lib/types/address';
import { nonNullish } from '@dfinity/utils';

export const isDestinationContractAddress = ({
	contractAddress,
	destination
}: {
	contractAddress: OptionAddress;
	destination: OptionAddress;
}): boolean =>
	nonNullish(contractAddress) && destination?.toLowerCase() === contractAddress.toLowerCase();
