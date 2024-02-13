import type { CkEthHelperContractAddressData } from '$icp-eth/stores/cketh.store';
import { nonNullish } from '@dfinity/utils';

export const isCkEthHelperContract = ({
	helperContractAddress,
	destination
}: {
	helperContractAddress: CkEthHelperContractAddressData | null | undefined;
	destination: string | undefined;
}): boolean =>
	nonNullish(helperContractAddress) &&
	destination?.toLowerCase() === helperContractAddress.data.toLowerCase();
